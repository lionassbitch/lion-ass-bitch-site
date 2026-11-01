import type { FastifyInstance } from "fastify";
import { and, desc, eq } from "drizzle-orm";
import type { AppContext } from "../context.js";
import { HttpError } from "../context.js";
import { requireAuth } from "../app.js";
import { StatementService, publicMedia, publicStatement } from "../services/statements.js";
import { languageSchema, privacyRequestSchema } from "../validation.js";
import { clientIp, clientUserAgent } from "../auth/session.js";
import { currentInviteId } from "./public.js";
import { privacyRequests, witnessStatements } from "../db/schema.js";

export async function registerWitnessRoutes(app: FastifyInstance, ctx: AppContext) {
  const svc = new StatementService(ctx);

  app.post<{ Body: { language?: string } }>("/api/statements", { config: { rateLimit: { max: 20, timeWindow: "1 minute" } } }, async (req, reply) => {
    const { session, user } = requireAuth(req);
    const language = languageSchema.catch("en").parse(req.body?.language);
    const inviteId = await currentInviteId(ctx, req.cookies ?? {});
    if (ctx.cfg.env.REQUIRE_INVITE_LINK && !inviteId && !session.isAdmin) throw new HttpError(403, "A private invitation link is required to begin a statement.", "invite_required");
    const st = await svc.createDraft(req, user, session, { language, inviteId });
    reply.status(201);
    return { statement: publicStatement(st) };
  });

  app.get("/api/statements", async (req) => {
    const { user } = requireAuth(req);
    const rows = await svc.listForUser(user.id);
    const supersededIds = new Set(rows.map((r) => r.supersedesId).filter(Boolean));
    return { statements: rows.map((r) => ({ ...publicStatement(r), supersededByLater: supersededIds.has(r.id) })) };
  });

  app.get<{ Params: { id: string } }>("/api/statements/:id", async (req) => {
    const { user } = requireAuth(req);
    const st = await svc.getOwned(user.id, req.params.id);
    const media = await svc.mediaFor(st.id, ["complete", "uploading"]);
    return { statement: publicStatement(st), media: media.filter((m) => m.kind === "video" || m.kind === "document").map(publicMedia) };
  });

  app.put<{ Params: { id: string }; Body: { language?: string } }>("/api/statements/:id/language", async (req) => {
    const { session, user } = requireAuth(req);
    const st = await svc.getOwned(user.id, req.params.id);
    const row = await svc.setLanguage(req, st, user, session, languageSchema.parse(req.body?.language));
    return { statement: publicStatement(row) };
  });

  app.put<{ Params: { id: string } }>("/api/statements/:id/consent", async (req) => {
    const { session, user } = requireAuth(req);
    const st = await svc.getOwned(user.id, req.params.id);
    return { statement: publicStatement(await svc.recordConsent(req, st, user, session, req.body)) };
  });

  app.put<{ Params: { id: string } }>("/api/statements/:id/profile", async (req) => {
    const { session, user } = requireAuth(req);
    const st = await svc.getOwned(user.id, req.params.id);
    return { statement: publicStatement(await svc.saveProfile(req, st, user, session, req.body)) };
  });

  app.put<{ Params: { id: string } }>("/api/statements/:id/answers", async (req) => {
    const { session, user } = requireAuth(req);
    const st = await svc.getOwned(user.id, req.params.id);
    return { statement: publicStatement(await svc.saveAnswers(req, st, user, session, req.body)) };
  });

  app.get<{ Params: { id: string } }>("/api/statements/:id/review", async (req) => {
    const { session, user } = requireAuth(req);
    const st = await svc.getOwned(user.id, req.params.id);
    if (st.status !== "draft") throw new HttpError(409, "This statement is already signed.", "finalized");
    await ctx.audit.record({ actorType: "witness", actorUserId: user.id, sessionId: session.id, statementId: st.id, action: "statement.reviewed", detail: {}, ipAddress: clientIp(ctx, req), userAgent: clientUserAgent(ctx, req) });
    return svc.buildReview(st, user, session);
  });

  app.post<{ Params: { id: string } }>("/api/statements/:id/sign", { config: { rateLimit: { max: 10, timeWindow: "1 minute" } } }, async (req) => {
    const { session, user } = requireAuth(req);
    const st = await svc.getOwned(user.id, req.params.id);
    return svc.sign(req, st, user, session, req.body);
  });

  app.get<{ Params: { id: string } }>("/api/statements/:id/receipt", async (req) => {
    const { user } = requireAuth(req);
    const st = await svc.getOwned(user.id, req.params.id);
    if (st.status !== "signed") throw new HttpError(409, "Not signed yet.", "not_signed");
    const sig = await svc.signatureFor(st.id);
    const media = await svc.mediaFor(st.id);
    return {
      statement: publicStatement(st),
      signature: sig ? { legalName: sig.legalName, method: sig.method, signedAt: sig.signedAt.toISOString(), affirmationText: sig.affirmationText, affirmationDate: sig.affirmationDate } : null,
      media: media.filter((m) => m.kind === "video" || m.kind === "document").map(publicMedia),
      frozenRecord: st.frozenRecord,
    };
  });

  app.get<{ Params: { id: string } }>("/api/statements/:id/pdf", { config: { rateLimit: { max: 30, timeWindow: "1 minute" } } }, async (req) => {
    const { session, user } = requireAuth(req);
    const st = await svc.getOwned(user.id, req.params.id);
    if (st.status !== "signed" || !st.pdfStorageKey) throw new HttpError(409, "No signed PDF yet.", "not_signed");
    const url = await ctx.storage.createDownloadUrl(st.pdfStorageKey, {
      ttlSeconds: ctx.cfg.env.DOWNLOAD_LINK_TTL_SECONDS,
      filename: `affirmation-${st.evidenceId}.pdf`,
      contentType: "application/pdf",
      disposition: "attachment",
    });
    await ctx.audit.record({ actorType: "witness", actorUserId: user.id, sessionId: session.id, statementId: st.id, action: "pdf.download_link_issued", detail: { ttlSeconds: ctx.cfg.env.DOWNLOAD_LINK_TTL_SECONDS }, ipAddress: clientIp(ctx, req), userAgent: clientUserAgent(ctx, req) });
    return { url, expiresInSeconds: ctx.cfg.env.DOWNLOAD_LINK_TTL_SECONDS, sha256: st.pdfSha256 };
  });

  app.post<{ Params: { id: string } }>("/api/statements/:id/corrections", { config: { rateLimit: { max: 10, timeWindow: "1 minute" } } }, async (req, reply) => {
    const { session, user } = requireAuth(req);
    const st = await svc.getOwned(user.id, req.params.id);
    const row = await svc.createCorrection(req, st, user, session);
    reply.status(201);
    return { statement: publicStatement(row) };
  });

  app.post<{ Params: { id: string } }>("/api/statements/:id/abandon", async (req) => {
    const { session, user } = requireAuth(req);
    const st = await svc.getOwned(user.id, req.params.id);
    await svc.abandonDraft(req, st, user, session);
    return { ok: true };
  });

  app.get("/api/privacy-requests", async (req) => {
    const { user } = requireAuth(req);
    const rows = await ctx.db.select().from(privacyRequests).where(eq(privacyRequests.userId, user.id)).orderBy(desc(privacyRequests.createdAt));
    return { requests: rows.map((r) => ({ id: r.id, statementId: r.statementId, requestType: r.requestType, message: r.message, status: r.status, createdAt: r.createdAt.toISOString(), resolvedAt: r.resolvedAt?.toISOString() ?? null, resolutionNote: r.resolutionNote })) };
  });

  app.post("/api/privacy-requests", { config: { rateLimit: { max: 10, timeWindow: "1 minute" } } }, async (req, reply) => {
    const { session, user } = requireAuth(req);
    const input = privacyRequestSchema.parse(req.body);
    if (input.statementId) {
      const [own] = await ctx.db.select({ id: witnessStatements.id }).from(witnessStatements).where(and(eq(witnessStatements.id, input.statementId), eq(witnessStatements.userId, user.id))).limit(1);
      if (!own) throw new HttpError(404, "Statement not found.", "not_found");
    }
    const [row] = await ctx.db.insert(privacyRequests).values({ userId: user.id, statementId: input.statementId, requestType: input.requestType, message: input.message }).returning();
    await ctx.audit.record({ actorType: "witness", actorUserId: user.id, sessionId: session.id, statementId: input.statementId, action: "privacy.request_submitted", detail: { requestId: row.id, requestType: input.requestType }, ipAddress: clientIp(ctx, req), userAgent: clientUserAgent(ctx, req) });
    reply.status(201);
    return { id: row.id, status: row.status };
  });
}
