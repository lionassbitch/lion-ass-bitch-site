import type { FastifyInstance } from "fastify";
import { eq } from "drizzle-orm";
import type { AppContext } from "../context.js";
import { HttpError } from "../context.js";
import { users } from "../db/schema.js";
import { signPayload, verifyPayload } from "../lib/crypto.js";
import { cookieOptions, createSession, revokeSession, clientIp, clientUserAgent } from "../auth/session.js";
import type { ProviderKey } from "../auth/oidc.js";
import { requireAuth } from "../app.js";
import { getEnrollment } from "../auth/mfa.js";

const OIDC_COOKIE = "wr_oidc";

function providerKey(raw: string): ProviderKey {
  if (raw === "google" || raw === "microsoft") return raw;
  throw new HttpError(404, "Unknown provider.", "unknown_provider");
}

function safeReturnTo(raw: unknown): string {
  if (typeof raw !== "string") return "/statement";
  if (!raw.startsWith("/") || raw.startsWith("//") || raw.includes("\\")) return "/statement";
  return raw.slice(0, 500);
}

export async function registerAuthRoutes(app: FastifyInstance, ctx: AppContext) {
  app.get<{ Params: { provider: string }; Querystring: { returnTo?: string; lang?: string } }>(
    "/auth/:provider/start",
    { config: { rateLimit: { max: 20, timeWindow: "1 minute" } } },
    async (req, reply) => {
      const key = providerKey(req.params.provider);
      if (!ctx.oidc.isConfigured(key)) throw new HttpError(503, `${ctx.cfg.providers[key].label} sign-in is not configured.`, "provider_not_configured");
      const start = await ctx.oidc.startLogin(key);
      const returnTo = safeReturnTo(req.query.returnTo);
      const lang = req.query.lang === "es" ? "es" : "en";
      const cookie = signPayload(ctx.cfg.sessionSecret, { p: key, s: start.state, n: start.nonce, v: start.codeVerifier, r: returnTo, l: lang }, 600);
      reply.setCookie(OIDC_COOKIE, cookie, { ...cookieOptions(ctx), maxAge: 600 });
      return reply.redirect(start.url, 302);
    },
  );

  app.get<{ Params: { provider: string } }>("/auth/:provider/callback", { config: { rateLimit: { max: 30, timeWindow: "1 minute" } } }, async (req, reply) => {
    const key = providerKey(req.params.provider);
    const raw = req.cookies?.[OIDC_COOKIE];
    reply.clearCookie(OIDC_COOKIE, cookieOptions(ctx));
    const pending = raw ? verifyPayload<{ p: string; s: string; n: string; v: string; r: string; l: string }>(ctx.cfg.sessionSecret, raw) : null;
    if (!pending || pending.p !== key) {
      await ctx.audit.record({ actorType: "anonymous", action: "auth.failed", detail: { provider: key, reason: "missing_or_expired_state" }, ipAddress: clientIp(ctx, req), userAgent: clientUserAgent(ctx, req) });
      return reply.redirect(`/sign-in?error=state&lang=${pending?.l ?? "en"}`, 302);
    }
    const currentUrl = new URL(req.raw.url ?? "/", ctx.cfg.baseUrl);
    let identity;
    try {
      identity = await ctx.oidc.finishLogin(key, currentUrl, { state: pending.s, nonce: pending.n, codeVerifier: pending.v });
    } catch (err) {
      req.log.warn({ err: (err as Error).message, provider: key }, "oidc login failed");
      await ctx.audit.record({ actorType: "anonymous", action: "auth.failed", detail: { provider: key, reason: String((err as Error).message).slice(0, 200) }, ipAddress: clientIp(ctx, req), userAgent: clientUserAgent(ctx, req) });
      return reply.redirect(`/sign-in?error=provider&lang=${pending.l}`, 302);
    }
    const now = new Date();
    const [user] = await ctx.db
      .insert(users)
      .values({
        provider: identity.provider,
        providerSubject: identity.subject,
        providerIssuer: identity.issuer,
        email: identity.email,
        emailVerified: identity.emailVerified,
        displayName: identity.displayName,
        lastLoginAt: now,
      })
      .onConflictDoUpdate({
        target: [users.provider, users.providerSubject],
        set: { email: identity.email, emailVerified: identity.emailVerified, displayName: identity.displayName, providerIssuer: identity.issuer, lastLoginAt: now },
      })
      .returning();
    const session = await createSession(
      ctx,
      req,
      reply,
      {
        id: user.id,
        provider: user.provider as ProviderKey,
        providerSubject: user.providerSubject,
        providerIssuer: user.providerIssuer,
        email: user.email,
        emailVerified: user.emailVerified,
        displayName: user.displayName,
      },
      identity.authenticatedAt,
    );
    await ctx.audit.record({
      actorType: session.isAdmin ? "admin" : "witness",
      actorUserId: user.id,
      sessionId: session.id,
      action: "auth.signed_in",
      detail: { provider: identity.provider, issuer: identity.issuer, emailVerified: identity.emailVerified, isAdmin: session.isAdmin },
      ipAddress: clientIp(ctx, req),
      userAgent: clientUserAgent(ctx, req),
    });
    const dest = pending.r.includes("?") ? `${pending.r}&lang=${pending.l}` : `${pending.r}?lang=${pending.l}`;
    return reply.redirect(dest, 302);
  });

  app.post("/api/auth/logout", async (req, reply) => {
    if (req.auth) {
      await ctx.audit.record({ actorType: req.auth.session.isAdmin ? "admin" : "witness", actorUserId: req.auth.user.id, sessionId: req.auth.session.id, action: "auth.signed_out", detail: {}, ipAddress: clientIp(ctx, req), userAgent: clientUserAgent(ctx, req) });
      await revokeSession(ctx, req.auth.session.id, reply);
    }
    return { ok: true };
  });

  app.get("/api/me", async (req) => {
    const { session, user } = requireAuth(req);
    const mfa = session.isAdmin ? await getEnrollment(ctx, user.id) : null;
    return {
      user: { id: user.id, provider: user.provider, email: user.email, emailVerified: user.emailVerified, displayName: user.displayName },
      session: {
        id: session.id,
        authenticatedAt: session.authenticatedAt.toISOString(),
        expiresAt: session.expiresAt.toISOString(),
        isAdmin: session.isAdmin,
        mfaRequired: ctx.cfg.env.ADMIN_MFA_REQUIRED,
        mfaEnrolled: Boolean(mfa),
        mfaVerified: Boolean(session.mfaVerifiedAt),
      },
    };
  });

  // Cheap existence check for the UI without triggering 401 noise.
  app.get("/api/session", async (req) => ({ authenticated: Boolean(req.auth), isAdmin: req.auth?.session.isAdmin ?? false }));

  void eq;
}
