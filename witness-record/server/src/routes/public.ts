import type { FastifyInstance } from "fastify";
import { eq, sql } from "drizzle-orm";
import type { AppContext } from "../context.js";
import { HttpError } from "../context.js";
import { inviteLinks } from "../db/schema.js";
import { hashToken, signPayload, verifyPayload } from "../lib/crypto.js";
import { PRIVACY_NOTICE_VERSION } from "../i18n/index.js";
import { cookieOptions } from "../auth/session.js";
import { CPLR_2106_FULL_TEXT, CPLR_2106_SOURCE_URL, CPLR_2106_RETRIEVED_ON } from "../statute/cplr2106.js";
import { LocalStorageDriver } from "../storage/local.js";
import { purgeExpiredDrafts } from "../services/retention.js";
import { timingSafeEqualStr } from "../lib/crypto.js";

export const INVITE_COOKIE = "wr_invite";

export async function currentInviteId(ctx: AppContext, cookies: Record<string, string | undefined>): Promise<string | null> {
  const token = cookies[INVITE_COOKIE];
  if (!token) return null;
  const payload = verifyPayload<{ inviteId: string }>(ctx.cfg.sessionSecret, token);
  if (!payload) return null;
  const [row] = await ctx.db.select().from(inviteLinks).where(eq(inviteLinks.id, payload.inviteId)).limit(1);
  if (!row || row.revokedAt) return null;
  return row.id;
}

export async function registerPublicRoutes(app: FastifyInstance, ctx: AppContext) {
  app.get("/api/health", async () => ({ ok: true, app: "THE WITNESS RECORD", startedAt: ctx.startedAt.toISOString() }));

  app.get("/api/config", async (req) => {
    const inviteId = await currentInviteId(ctx, req.cookies ?? {});
    return {
      app: "THE WITNESS RECORD",
      providers: {
        google: { configured: ctx.oidc.isConfigured("google") },
        microsoft: { configured: ctx.oidc.isConfigured("microsoft") },
      },
      inviteRequired: ctx.cfg.env.REQUIRE_INVITE_LINK,
      inviteValid: Boolean(inviteId),
      privacyNoticeVersion: PRIVACY_NOTICE_VERSION,
      caseSubject: ctx.cfg.env.CASE_SUBJECT_NAME,
      caseAddress: ctx.cfg.env.CASE_ADDRESS,
      limits: {
        maxVideoBytes: ctx.cfg.env.MAX_VIDEO_BYTES,
        maxDocumentBytes: ctx.cfg.env.MAX_DOCUMENT_BYTES,
        maxDocuments: ctx.cfg.env.MAX_DOCUMENTS_PER_STATEMENT,
        chunkBytes: ctx.cfg.env.UPLOAD_CHUNK_BYTES,
      },
      metadata: { ipAddress: ctx.cfg.env.COLLECT_IP_ADDRESS, userAgent: ctx.cfg.env.COLLECT_USER_AGENT },
      statute: { sourceUrl: CPLR_2106_SOURCE_URL, retrievedOn: CPLR_2106_RETRIEVED_ON, fullText: CPLR_2106_FULL_TEXT },
    };
  });

  app.post<{ Body: { token?: string } }>("/api/invite/open", { config: { rateLimit: { max: 30, timeWindow: "1 minute" } } }, async (req, reply) => {
    const token = typeof req.body?.token === "string" ? req.body.token : "";
    if (!token || token.length > 200) throw new HttpError(400, "Invalid link.", "invite_invalid");
    const [row] = await ctx.db.select().from(inviteLinks).where(eq(inviteLinks.tokenHash, hashToken(token))).limit(1);
    if (!row || row.revokedAt) throw new HttpError(404, "This private link is no longer active.", "invite_invalid");
    await ctx.db.update(inviteLinks).set({ openCount: sql`${inviteLinks.openCount} + 1` }).where(eq(inviteLinks.id, row.id));
    const cookie = signPayload(ctx.cfg.sessionSecret, { inviteId: row.id }, 30 * 24 * 3600);
    reply.setCookie(INVITE_COOKIE, cookie, { ...cookieOptions(ctx), maxAge: 30 * 24 * 3600 });
    await ctx.audit.record({ actorType: "anonymous", action: "invite.opened", detail: { inviteId: row.id, label: row.label }, ipAddress: ctx.cfg.env.COLLECT_IP_ADDRESS ? req.ip : null });
    return { ok: true };
  });

  // Local storage driver, direct-upload mode: the browser PUTs each part to a
  // signed URL. (With S3 the presigned URL points at the bucket instead.)
  app.put<{ Params: { token: string } }>("/api/files/part/:token", { config: { rateLimit: { max: 1200, timeWindow: "1 minute" } } }, async (req) => {
    if (!(ctx.storage instanceof LocalStorageDriver)) throw new HttpError(404, "Not found.", "not_found");
    const payload = ctx.storage.verifyPartToken(req.params.token);
    if (!payload) throw new HttpError(403, "This upload link has expired.", "link_expired");
    if (!Buffer.isBuffer(req.body) || req.body.length === 0) throw new HttpError(400, "Send the part as application/octet-stream.", "bad_part");
    try {
      await ctx.storage.writePart(payload.staging, payload.part, req.body);
    } catch (err) {
      throw new HttpError(409, String((err as Error).message), "part_mismatch");
    }
    return { ok: true, part: payload.part, size: req.body.length };
  });

  // Scheduled retention (for hosts that scale to zero, where the in-process
  // timer cannot be relied on). Vercel Cron sends `Authorization: Bearer CRON_SECRET`.
  app.get("/api/cron/retention", { config: { rateLimit: { max: 10, timeWindow: "1 minute" } } }, async (req) => {
    const secret = ctx.cfg.env.CRON_SECRET;
    const header = req.headers.authorization ?? "";
    if (!secret || !header.startsWith("Bearer ") || !timingSafeEqualStr(header.slice(7), secret)) throw new HttpError(401, "Unauthorized.", "unauthorized");
    const result = await purgeExpiredDrafts(ctx);
    await ctx.audit.record({ actorType: "system", action: "retention.scheduled_run", detail: result });
    return { ok: true, ...result };
  });

  // Local storage driver: short-lived signed download links are served here.
  app.get<{ Params: { token: string } }>("/api/files/:token", { config: { rateLimit: { max: 120, timeWindow: "1 minute" } } }, async (req, reply) => {
    if (ctx.storage.kind !== "local") throw new HttpError(404, "Not found.", "not_found");
    const payload = verifyPayload<{ key: string; fn: string; ct: string; d: string }>(ctx.cfg.sessionSecret, req.params.token);
    if (!payload) throw new HttpError(403, "This download link has expired.", "link_expired");
    const head = await ctx.storage.headObject(payload.key);
    if (!head) throw new HttpError(404, "File not found.", "not_found");
    const stream = await ctx.storage.getObjectStream(payload.key);
    reply.header("Content-Type", payload.ct);
    reply.header("Content-Length", head.size);
    reply.header("Content-Disposition", `${payload.d === "inline" ? "inline" : "attachment"}; filename="${payload.fn.replace(/["\r\n]/g, "_")}"`);
    reply.header("Cache-Control", "no-store");
    reply.header("X-Content-Type-Options", "nosniff");
    return reply.send(stream);
  });
}
