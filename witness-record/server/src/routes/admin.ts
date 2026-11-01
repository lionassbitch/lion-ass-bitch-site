import type { FastifyInstance, FastifyRequest } from "fastify";
import { and, desc, eq, inArray } from "drizzle-orm";
import { ZipArchive, type Archiver } from "archiver";
import { PassThrough } from "node:stream";
import QRCode from "qrcode";
import { z } from "zod";
import type { AppContext } from "../context.js";
import { HttpError } from "../context.js";
import { requireAuth } from "../app.js";
import { adminAnnotations, auditEvents, inviteLinks, mediaAssets, privacyRequests, signatures, users, witnessStatements } from "../db/schema.js";
import { clientIp, clientUserAgent, markMfaVerified, cookieOptions, type CurrentSession, type CurrentUser } from "../auth/session.js";
import { consumeStep, getEnrollment, newTotpSecret, otpauthUrlAndQr, saveEnrollment, verifyTotp } from "../auth/mfa.js";
import { signPayload, verifyPayload, randomToken, hashToken } from "../lib/crypto.js";
import { BundleService } from "../services/bundle.js";
import { StatementService, publicMedia, publicStatement, type StatementRow } from "../services/statements.js";
import { readinessReport } from "../services/readiness.js";
import { extensionFor } from "../services/filetype.js";
import type { ApproximateDate } from "../types.js";
import { dict } from "../i18n/index.js";

const MFA_ENROLL_COOKIE = "wr_mfa_enroll";

function adminMeta(ctx: AppContext, req: FastifyRequest) {
  return { ipAddress: clientIp(ctx, req), userAgent: clientUserAgent(ctx, req) };
}

/** Admin gate: allowlisted session, plus verified TOTP when MFA is required. */
async function requireAdmin(ctx: AppContext, req: FastifyRequest): Promise<{ session: CurrentSession; user: CurrentUser }> {
  const auth = requireAuth(req);
  if (!auth.session.isAdmin) throw new HttpError(403, "This account is not on the administrator allowlist.", "not_admin");
  if (ctx.cfg.env.ADMIN_MFA_REQUIRED) {
    const enrollment = await getEnrollment(ctx, auth.user.id);
    if (!enrollment) throw new HttpError(403, "Set up multi-factor authentication to continue.", "mfa_enroll_required");
    if (!auth.session.mfaVerifiedAt) throw new HttpError(403, "Enter your authenticator code to continue.", "mfa_required");
  }
  return auth;
}

function dateBounds(d: ApproximateDate | undefined | null): { start: string | null; end: string | null } {
  if (!d) return { start: null, end: null };
  switch (d.precision) {
    case "exact":
    case "approximate":
      return { start: d.date ?? null, end: d.date ?? null };
    case "month_year":
      return { start: d.month ? `${d.month}-01` : null, end: d.month ? `${d.month}-31` : null };
    case "range":
      return { start: d.rangeStart ? pad(d.rangeStart, "01") : null, end: d.rangeEnd ? pad(d.rangeEnd, "31") : null };
    default:
      return { start: null, end: null };
  }
}
function pad(v: string, day: string) {
  return v.length === 7 ? `${v}-${day}` : v;
}

const listQuery = z.object({
  status: z.enum(["all", "signed", "draft", "abandoned"]).default("all"),
  submittedFrom: z.string().optional(),
  submittedTo: z.string().optional(),
  observedFrom: z.string().optional(),
  observedTo: z.string().optional(),
  q: z.string().trim().max(200).optional(),
});

export async function registerAdminRoutes(app: FastifyInstance, ctx: AppContext) {
  const statements = new StatementService(ctx);
  const bundles = new BundleService(ctx);

  // ---- MFA (requires allowlisted session, not yet MFA) -------------------
  app.get("/api/admin/mfa", async (req) => {
    const { session, user } = requireAuth(req);
    if (!session.isAdmin) throw new HttpError(403, "Not an administrator.", "not_admin");
    const enrollment = await getEnrollment(ctx, user.id);
    return { required: ctx.cfg.env.ADMIN_MFA_REQUIRED, enrolled: Boolean(enrollment), verified: Boolean(session.mfaVerifiedAt), encryptionKeyPresent: Boolean(ctx.cfg.encryptionKey) };
  });

  app.post("/api/admin/mfa/enroll/start", { config: { rateLimit: { max: 10, timeWindow: "1 minute" } } }, async (req, reply) => {
    const { session, user } = requireAuth(req);
    if (!session.isAdmin) throw new HttpError(403, "Not an administrator.", "not_admin");
    if (!ctx.cfg.encryptionKey) throw new HttpError(503, "APP_ENCRYPTION_KEY is not configured.", "no_encryption_key");
    if (await getEnrollment(ctx, user.id)) throw new HttpError(409, "Already enrolled. Use scripts/reset-admin-mfa.ts to re-enroll.", "already_enrolled");
    const secret = newTotpSecret();
    const { url, qrDataUrl } = await otpauthUrlAndQr(secret, user.email ?? user.providerSubject);
    reply.setCookie(MFA_ENROLL_COOKIE, signPayload(ctx.cfg.sessionSecret, { u: user.id, s: secret }, 600), { ...cookieOptions(ctx), maxAge: 600 });
    return { otpauthUrl: url, qrDataUrl, manualKey: secret };
  });

  app.post<{ Body: { code?: string } }>("/api/admin/mfa/enroll/confirm", { config: { rateLimit: { max: 10, timeWindow: "1 minute" } } }, async (req, reply) => {
    const { session, user } = requireAuth(req);
    if (!session.isAdmin) throw new HttpError(403, "Not an administrator.", "not_admin");
    const raw = req.cookies?.[MFA_ENROLL_COOKIE];
    const pending = raw ? verifyPayload<{ u: string; s: string }>(ctx.cfg.sessionSecret, raw) : null;
    if (!pending || pending.u !== user.id) throw new HttpError(400, "Enrollment expired; start again.", "enroll_expired");
    const step = verifyTotp(pending.s, String(req.body?.code ?? ""));
    if (step === null) throw new HttpError(400, "That code is not valid.", "bad_code");
    await saveEnrollment(ctx, user.id, pending.s);
    await consumeStep(ctx, user.id, step, null);
    await markMfaVerified(ctx, session.id);
    reply.clearCookie(MFA_ENROLL_COOKIE, cookieOptions(ctx));
    await ctx.audit.record({ actorType: "admin", actorUserId: user.id, sessionId: session.id, action: "admin.mfa_enrolled", detail: {}, ...adminMeta(ctx, req) });
    return { ok: true };
  });

  app.post<{ Body: { code?: string } }>("/api/admin/mfa/verify", { config: { rateLimit: { max: 10, timeWindow: "1 minute" } } }, async (req) => {
    const { session, user } = requireAuth(req);
    if (!session.isAdmin) throw new HttpError(403, "Not an administrator.", "not_admin");
    const enrollment = await getEnrollment(ctx, user.id);
    if (!enrollment) throw new HttpError(409, "Not enrolled.", "mfa_enroll_required");
    const step = verifyTotp(enrollment.secret, String(req.body?.code ?? ""));
    if (step === null || !(await consumeStep(ctx, user.id, step, enrollment.lastUsedStep))) {
      await ctx.audit.record({ actorType: "admin", actorUserId: user.id, sessionId: session.id, action: "admin.mfa_failed", detail: {}, ...adminMeta(ctx, req) });
      throw new HttpError(400, "That code is not valid.", "bad_code");
    }
    await markMfaVerified(ctx, session.id);
    await ctx.audit.record({ actorType: "admin", actorUserId: user.id, sessionId: session.id, action: "admin.mfa_verified", detail: {}, ...adminMeta(ctx, req) });
    return { ok: true };
  });

  // ---- Dashboard ----------------------------------------------------------
  app.get("/api/admin/overview", async (req) => {
    await requireAdmin(ctx, req);
    const rows = await ctx.db.select({ status: witnessStatements.status }).from(witnessStatements);
    const counts = { signed: 0, draft: 0, abandoned: 0 };
    for (const r of rows) counts[r.status as keyof typeof counts]++;
    const pending = await ctx.db.select({ id: privacyRequests.id }).from(privacyRequests).where(inArray(privacyRequests.status, ["received", "in_review"]));
    return { counts, pendingPrivacyRequests: pending.length, storage: { driver: ctx.storage.kind, description: ctx.storage.description }, caseSubject: ctx.cfg.env.CASE_SUBJECT_NAME, caseAddress: ctx.cfg.env.CASE_ADDRESS };
  });

  app.get<{ Querystring: Record<string, string> }>("/api/admin/statements", async (req) => {
    const { session, user } = await requireAdmin(ctx, req);
    const q = listQuery.parse(req.query);
    const rows = await ctx.db
      .select({ st: witnessStatements, u: users })
      .from(witnessStatements)
      .innerJoin(users, eq(users.id, witnessStatements.userId))
      .orderBy(desc(witnessStatements.createdAt));
    const mediaCounts = await ctx.db.select({ statementId: mediaAssets.statementId, kind: mediaAssets.kind }).from(mediaAssets).where(eq(mediaAssets.status, "complete"));
    const countsByStatement = new Map<string, { video: number; document: number }>();
    for (const m of mediaCounts) {
      const c = countsByStatement.get(m.statementId) ?? { video: 0, document: 0 };
      if (m.kind === "video") c.video++;
      if (m.kind === "document") c.document++;
      countsByStatement.set(m.statementId, c);
    }
    const supersededIds = new Set(rows.map((r) => r.st.supersedesId).filter(Boolean));
    const needle = q.q?.toLowerCase();
    const out = rows
      .filter(({ st }) => q.status === "all" || st.status === q.status)
      .filter(({ st }) => {
        const submitted = (st.finalizedAt ?? st.createdAt).toISOString().slice(0, 10);
        if (q.submittedFrom && submitted < q.submittedFrom) return false;
        if (q.submittedTo && submitted > q.submittedTo) return false;
        if (q.observedFrom || q.observedTo) {
          const b3 = dateBounds(st.answers?.q3_firstAware);
          const b4 = dateBounds(st.answers?.q4_mostRecentObservation);
          const start = [b3.start, b4.start].filter(Boolean).sort()[0] ?? null;
          const end = [b3.end, b4.end].filter(Boolean).sort().at(-1) ?? null;
          if (!start && !end) return false;
          if (q.observedFrom && end && end < q.observedFrom) return false;
          if (q.observedTo && start && start > q.observedTo) return false;
        }
        return true;
      })
      .filter(({ st, u }) => {
        if (!needle) return true;
        const hay = [st.evidenceId, st.profile?.legalName, st.profile?.relationshipCategory, st.profile?.relationshipDescription, u.email, u.displayName].filter(Boolean).join(" ").toLowerCase();
        return hay.includes(needle);
      })
      .map(({ st, u }) => ({
        id: st.id,
        evidenceId: st.evidenceId,
        status: st.status,
        version: st.version,
        supersedesId: st.supersedesId,
        supersededByLater: supersededIds.has(st.id),
        language: st.language,
        legalName: st.profile?.legalName ?? null,
        relationshipCategory: st.profile?.relationshipCategory ?? null,
        personalKnowledge: st.answers?.q2_personalKnowledge ?? null,
        firstAware: st.answers?.q3_firstAware ?? null,
        mostRecent: st.answers?.q4_mostRecentObservation ?? null,
        account: { provider: u.provider, email: u.email, emailVerified: u.emailVerified, displayName: u.displayName },
        createdAt: st.createdAt.toISOString(),
        finalizedAt: st.finalizedAt?.toISOString() ?? null,
        media: countsByStatement.get(st.id) ?? { video: 0, document: 0 },
        hasConsent: Boolean(st.consent),
        hasProfile: Boolean(st.profile),
        hasAnswers: Boolean(st.answers),
        lastError: st.lastError,
      }));
    await ctx.audit.record({ actorType: "admin", actorUserId: user.id, sessionId: session.id, action: "admin.list_viewed", detail: { filters: q, results: out.length }, ...adminMeta(ctx, req) });
    return { statements: out };
  });

  app.get<{ Params: { id: string } }>("/api/admin/statements/:id", async (req) => {
    const { session, user } = await requireAdmin(ctx, req);
    const st = await statements.getById(req.params.id);
    await ctx.audit.record({ actorType: "admin", actorUserId: user.id, sessionId: session.id, statementId: st.id, action: "admin.statement_viewed", detail: { evidenceId: st.evidenceId }, ...adminMeta(ctx, req) });
    const [owner] = await ctx.db.select().from(users).where(eq(users.id, st.userId)).limit(1);
    const media = await ctx.db.select().from(mediaAssets).where(eq(mediaAssets.statementId, st.id)).orderBy(mediaAssets.createdAt);
    const [sig] = await ctx.db.select().from(signatures).where(eq(signatures.statementId, st.id)).limit(1);
    const audit = await ctx.db.select().from(auditEvents).where(eq(auditEvents.statementId, st.id)).orderBy(auditEvents.id);
    const notes = await ctx.db.select().from(adminAnnotations).where(eq(adminAnnotations.statementId, st.id)).orderBy(adminAnnotations.createdAt);
    const versions = await ctx.db.select().from(witnessStatements).where(eq(witnessStatements.rootId, st.rootId)).orderBy(witnessStatements.version);
    return {
      statement: { ...publicStatement(st), authSnapshot: st.authSnapshot, frozenRecord: st.frozenRecord, lastError: st.lastError },
      account: owner ? { provider: owner.provider, providerIssuer: owner.providerIssuer, providerSubject: owner.providerSubject, email: owner.email, emailVerified: owner.emailVerified, displayName: owner.displayName, lastLoginAt: owner.lastLoginAt?.toISOString() ?? null } : null,
      media: media.map((m) => ({ ...publicMedia(m), storageKey: m.storageKey, scanDetail: m.scanDetail })),
      signature: sig
        ? { legalName: sig.legalName, method: sig.method, typedValue: sig.typedValue, imageSha256: sig.imageSha256, affirmationText: sig.affirmationText, affirmationDate: sig.affirmationDate, signedAt: sig.signedAt.toISOString(), ipAddress: sig.ipAddress, userAgent: sig.userAgent, recordSha256: sig.recordSha256, sessionId: sig.sessionId, consentStatement: sig.consentStatement }
        : null,
      audit: audit.map((e) => ({ id: e.id, occurredAt: e.occurredAt.toISOString(), actorType: e.actorType, actorUserId: e.actorUserId, action: e.action, detail: e.detail, ipAddress: e.ipAddress, userAgent: e.userAgent, prevHash: e.prevHash, entryHash: e.entryHash })),
      annotations: notes.map((n) => ({ id: n.id, adminUserId: n.adminUserId, body: n.body, createdAt: n.createdAt.toISOString() })),
      versions: versions.map((v) => ({ id: v.id, evidenceId: v.evidenceId, version: v.version, status: v.status, finalizedAt: v.finalizedAt?.toISOString() ?? null })),
    };
  });

  app.get<{ Params: { id: string; mediaId: string }; Querystring: { inline?: string } }>("/api/admin/statements/:id/media/:mediaId/link", { config: { rateLimit: { max: 60, timeWindow: "1 minute" } } }, async (req) => {
    const { session, user } = await requireAdmin(ctx, req);
    const st = await statements.getById(req.params.id);
    const [m] = await ctx.db.select().from(mediaAssets).where(and(eq(mediaAssets.id, req.params.mediaId), eq(mediaAssets.statementId, st.id))).limit(1);
    if (!m || m.status !== "complete") throw new HttpError(404, "File not found.", "not_found");
    const inline = req.query.inline === "1";
    const filename = m.kind === "affirmation_pdf" ? `affirmation-${st.evidenceId}.pdf` : m.kind === "video" ? `${st.evidenceId}-video-original.${extensionFor(m.detectedMime)}` : m.originalFilename ?? `${st.evidenceId}-${m.kind}.${extensionFor(m.detectedMime)}`;
    const url = await ctx.storage.createDownloadUrl(m.storageKey, { ttlSeconds: ctx.cfg.env.DOWNLOAD_LINK_TTL_SECONDS, filename, contentType: m.detectedMime ?? "application/octet-stream", disposition: inline ? "inline" : "attachment" });
    await ctx.audit.record({ actorType: "admin", actorUserId: user.id, sessionId: session.id, statementId: st.id, mediaAssetId: m.id, action: inline ? "admin.media_played" : "admin.media_download_link_issued", detail: { kind: m.kind, sha256: m.sha256, ttlSeconds: ctx.cfg.env.DOWNLOAD_LINK_TTL_SECONDS }, ...adminMeta(ctx, req) });
    return { url, expiresInSeconds: ctx.cfg.env.DOWNLOAD_LINK_TTL_SECONDS, sha256: m.sha256, contentType: m.detectedMime, filename };
  });

  app.get<{ Params: { id: string } }>("/api/admin/statements/:id/bundle.zip", { config: { rateLimit: { max: 20, timeWindow: "1 minute" } } }, async (req, reply) => {
    const { session, user } = await requireAdmin(ctx, req);
    const st = await statements.getById(req.params.id);
    await ctx.audit.record({ actorType: "admin", actorUserId: user.id, sessionId: session.id, statementId: st.id, action: "admin.bundle_exported", detail: { evidenceId: st.evidenceId }, ...adminMeta(ctx, req) });
    reply.header("Content-Type", "application/zip");
    reply.header("Content-Disposition", `attachment; filename="evidence-${st.evidenceId}.zip"`);
    return reply.send(await bundles.zipStream(st));
  });

  app.get("/api/admin/export/all.zip", { config: { rateLimit: { max: 5, timeWindow: "1 minute" } } }, async (req, reply) => {
    const { session, user } = await requireAdmin(ctx, req);
    const rows = await ctx.db.select().from(witnessStatements).orderBy(witnessStatements.createdAt);
    await ctx.audit.record({ actorType: "admin", actorUserId: user.id, sessionId: session.id, action: "admin.all_exported", detail: { statements: rows.length }, ...adminMeta(ctx, req) });
    const archive = new ZipArchive({ zlib: { level: 6 } });
    const out = new PassThrough();
    archive.on("error", (err: Error) => out.destroy(err));
    archive.pipe(out);
    reply.header("Content-Type", "application/zip");
    reply.header("Content-Disposition", `attachment; filename="witness-record-export-${new Date().toISOString().slice(0, 10)}.zip"`);
    void (async () => {
      try {
        const index = await metadataRows(rows);
        archive.append(JSON.stringify({ generatedAtUtc: new Date().toISOString(), application: "THE WITNESS RECORD", statements: index }, null, 2), { name: "index.json" });
        archive.append(toCsv(index), { name: "index.csv" });
        for (const st of rows) await bundles.appendStatementToArchive(archive, st, `${st.evidenceId}/`);
        await archive.finalize();
      } catch (err) {
        out.destroy(err as Error);
      }
    })();
    return reply.send(out);
  });

  app.get<{ Querystring: { format?: string } }>("/api/admin/export/metadata", { config: { rateLimit: { max: 20, timeWindow: "1 minute" } } }, async (req, reply) => {
    const { session, user } = await requireAdmin(ctx, req);
    const rows = await ctx.db.select().from(witnessStatements).orderBy(witnessStatements.createdAt);
    const index = await metadataRows(rows);
    await ctx.audit.record({ actorType: "admin", actorUserId: user.id, sessionId: session.id, action: "admin.metadata_exported", detail: { format: req.query.format ?? "json", statements: rows.length }, ...adminMeta(ctx, req) });
    if (req.query.format === "csv") {
      reply.header("Content-Type", "text/csv; charset=utf-8");
      reply.header("Content-Disposition", `attachment; filename="witness-record-metadata.csv"`);
      return reply.send(toCsv(index));
    }
    reply.header("Content-Disposition", `attachment; filename="witness-record-metadata.json"`);
    return { generatedAtUtc: new Date().toISOString(), statements: index };
  });

  async function metadataRows(rows: StatementRow[]) {
    const sigs = await ctx.db.select().from(signatures);
    const sigBy = new Map(sigs.map((s) => [s.statementId, s]));
    const media = await ctx.db.select().from(mediaAssets).where(eq(mediaAssets.status, "complete"));
    const owners = await ctx.db.select().from(users);
    const ownerBy = new Map(owners.map((o) => [o.id, o]));
    return rows.map((st) => {
      const own = ownerBy.get(st.userId);
      const s = sigBy.get(st.id);
      const m = media.filter((x) => x.statementId === st.id);
      const video = m.find((x) => x.kind === "video");
      return {
        evidenceId: st.evidenceId,
        statementId: st.id,
        status: st.status,
        version: st.version,
        supersedesId: st.supersedesId,
        language: st.language,
        legalName: st.profile?.legalName ?? "",
        relationshipCategory: st.profile?.relationshipCategory ?? "",
        personalKnowledge: st.answers?.q2_personalKnowledge ?? "",
        firstAware: st.answers ? JSON.stringify(st.answers.q3_firstAware) : "",
        mostRecentObservation: st.answers ? JSON.stringify(st.answers.q4_mostRecentObservation) : "",
        accountProvider: own?.provider ?? "",
        accountEmail: own?.email ?? "",
        accountEmailVerified: own?.emailVerified ?? false,
        accountSubject: own?.providerSubject ?? "",
        createdAtUtc: st.createdAt.toISOString(),
        finalizedAtUtc: st.finalizedAt?.toISOString() ?? "",
        signatureMethod: s?.method ?? "",
        signedAtUtc: s?.signedAt.toISOString() ?? "",
        frozenRecordSha256: st.frozenRecordSha256 ?? "",
        pdfSha256: st.pdfSha256 ?? "",
        videoSha256: video?.sha256 ?? "",
        videoSizeBytes: video?.sizeBytes ?? "",
        videoReceivedAtUtc: video?.receivedAt?.toISOString() ?? "",
        documentCount: m.filter((x) => x.kind === "document").length,
      };
    });
  }

  app.post<{ Params: { id: string }; Body: { body?: string } }>("/api/admin/statements/:id/annotations", async (req, reply) => {
    const { session, user } = await requireAdmin(ctx, req);
    const st = await statements.getById(req.params.id);
    const body = z.string().trim().min(1).max(5000).parse(req.body?.body);
    const [row] = await ctx.db.insert(adminAnnotations).values({ statementId: st.id, adminUserId: user.id, body }).returning();
    await ctx.audit.record({ actorType: "admin", actorUserId: user.id, sessionId: session.id, statementId: st.id, action: "admin.annotation_added", detail: { annotationId: row.id }, ...adminMeta(ctx, req) });
    reply.status(201);
    return { annotation: { id: row.id, body: row.body, createdAt: row.createdAt.toISOString(), adminUserId: row.adminUserId } };
  });

  // ---- Invitations --------------------------------------------------------
  app.get("/api/admin/invites", async (req) => {
    await requireAdmin(ctx, req);
    const rows = await ctx.db.select().from(inviteLinks).orderBy(desc(inviteLinks.createdAt));
    return { invites: rows.map((r) => ({ id: r.id, label: r.label, createdAt: r.createdAt.toISOString(), revokedAt: r.revokedAt?.toISOString() ?? null, openCount: r.openCount })) };
  });

  app.post<{ Body: { label?: string } }>("/api/admin/invites", { config: { rateLimit: { max: 20, timeWindow: "1 minute" } } }, async (req, reply) => {
    const { session, user } = await requireAdmin(ctx, req);
    const label = z.string().trim().min(1).max(100).parse(req.body?.label);
    const token = randomToken(24);
    const [row] = await ctx.db.insert(inviteLinks).values({ tokenHash: hashToken(token), label, createdBy: user.id }).returning();
    const url = new URL(`/i/${token}`, ctx.cfg.baseUrl).toString();
    const qrDataUrl = await QRCode.toDataURL(url, { margin: 1, width: 320, errorCorrectionLevel: "M" });
    await ctx.audit.record({ actorType: "admin", actorUserId: user.id, sessionId: session.id, action: "admin.invite_created", detail: { inviteId: row.id, label }, ...adminMeta(ctx, req) });
    reply.status(201);
    return { invite: { id: row.id, label, createdAt: row.createdAt.toISOString(), url, qrDataUrl }, messages: invitationMessages(url) };
  });

  app.post<{ Params: { id: string } }>("/api/admin/invites/:id/revoke", async (req) => {
    const { session, user } = await requireAdmin(ctx, req);
    await ctx.db.update(inviteLinks).set({ revokedAt: new Date() }).where(eq(inviteLinks.id, req.params.id));
    await ctx.audit.record({ actorType: "admin", actorUserId: user.id, sessionId: session.id, action: "admin.invite_revoked", detail: { inviteId: req.params.id }, ...adminMeta(ctx, req) });
    return { ok: true };
  });

  app.get("/api/admin/invite-message", async (req) => {
    await requireAdmin(ctx, req);
    return { messages: invitationMessages(new URL("/", ctx.cfg.baseUrl).toString()) };
  });

  // ---- Audit, privacy requests, readiness --------------------------------
  app.get<{ Querystring: { limit?: string } }>("/api/admin/audit", async (req) => {
    await requireAdmin(ctx, req);
    const limit = Math.min(Math.max(Number(req.query.limit ?? 200), 1), 1000);
    const rows = await ctx.db.select().from(auditEvents).orderBy(desc(auditEvents.id)).limit(limit);
    return { events: rows.map((e) => ({ id: e.id, occurredAt: e.occurredAt.toISOString(), actorType: e.actorType, actorUserId: e.actorUserId, statementId: e.statementId, mediaAssetId: e.mediaAssetId, action: e.action, detail: e.detail, ipAddress: e.ipAddress, entryHash: e.entryHash })) };
  });

  app.post("/api/admin/audit/verify", async (req) => {
    const { session, user } = await requireAdmin(ctx, req);
    const result = await ctx.audit.verifyChain();
    await ctx.audit.record({ actorType: "admin", actorUserId: user.id, sessionId: session.id, action: "admin.audit_chain_verified", detail: result, ...adminMeta(ctx, req) });
    return result;
  });

  app.get("/api/admin/privacy-requests", async (req) => {
    await requireAdmin(ctx, req);
    const rows = await ctx.db.select({ r: privacyRequests, u: users }).from(privacyRequests).innerJoin(users, eq(users.id, privacyRequests.userId)).orderBy(desc(privacyRequests.createdAt));
    return { requests: rows.map(({ r, u }) => ({ id: r.id, statementId: r.statementId, requestType: r.requestType, message: r.message, status: r.status, createdAt: r.createdAt.toISOString(), resolvedAt: r.resolvedAt?.toISOString() ?? null, resolutionNote: r.resolutionNote, account: { provider: u.provider, email: u.email, displayName: u.displayName } })) };
  });

  app.post<{ Params: { id: string }; Body: { status?: string; resolutionNote?: string } }>("/api/admin/privacy-requests/:id", async (req) => {
    const { session, user } = await requireAdmin(ctx, req);
    const status = z.enum(["received", "in_review", "resolved", "declined"]).parse(req.body?.status);
    const note = z.string().trim().max(5000).optional().parse(req.body?.resolutionNote);
    const [row] = await ctx.db
      .update(privacyRequests)
      .set({ status, resolutionNote: note ?? null, handledBy: user.id, resolvedAt: status === "resolved" || status === "declined" ? new Date() : null })
      .where(eq(privacyRequests.id, req.params.id))
      .returning();
    if (!row) throw new HttpError(404, "Request not found.", "not_found");
    await ctx.audit.record({ actorType: "admin", actorUserId: user.id, sessionId: session.id, statementId: row.statementId, action: "privacy.request_updated", detail: { requestId: row.id, status }, ...adminMeta(ctx, req) });
    return { ok: true };
  });

  app.get("/api/admin/readiness", async (req) => {
    await requireAdmin(ctx, req);
    return readinessReport(ctx);
  });
}

function invitationMessages(url: string) {
  const en = `Hello,

I am gathering firsthand accounts about where I lived. If you personally knew me to reside at 1665 Morris Avenue in the Bronx, you may — if you wish — provide a short voluntary statement describing only what you yourself remember. You can also say that you do not know or do not remember; honest uncertainty is just as useful as certainty.

The private link below opens THE WITNESS RECORD. It is not a petition and nothing you provide is public. Your statement may be shared with my legal counsel or used in a legal proceeding. You can stop at any point before signing.

${url}

There is no obligation to participate, and nothing changes between us if you decline. Thank you for considering it.

— Eddie Colón`;
  const es = `Hola:

Estoy reuniendo relatos de primera mano sobre dónde he vivido. Si usted sabe personalmente que yo residía en 1665 Morris Avenue en el Bronx, puede, si así lo desea, ofrecer una breve declaración voluntaria describiendo únicamente lo que usted mismo/a recuerda. También puede decir que no lo sabe o no lo recuerda; la incertidumbre honesta es tan útil como la certeza.

El enlace privado de abajo abre THE WITNESS RECORD. No es una petición y nada de lo que aporte es público. Su declaración puede compartirse con mi abogado o usarse en un procedimiento legal. Puede detenerse en cualquier momento antes de firmar.

${url}

No hay ninguna obligación de participar, y nada cambia entre nosotros si decide no hacerlo. Gracias por considerarlo.

— Eddie Colón`;
  void dict;
  return { en, es };
}

function toCsv(rows: Record<string, unknown>[]): string {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]);
  const esc = (v: unknown) => {
    const s = v === null || v === undefined ? "" : String(v);
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [headers.join(","), ...rows.map((r) => headers.map((h) => esc(r[h])).join(","))].join("\r\n") + "\r\n";
}
