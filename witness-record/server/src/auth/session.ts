import { and, eq, isNull } from "drizzle-orm";
import type { FastifyReply, FastifyRequest } from "fastify";
import type { AppContext } from "../context.js";
import { sessions, users } from "../db/schema.js";
import { hashToken, randomToken } from "../lib/crypto.js";
import { matchesAdminAllowlist } from "./admin.js";

export const SESSION_COOKIE = "wr_session";

export interface CurrentUser {
  id: string;
  provider: "google" | "microsoft";
  providerSubject: string;
  providerIssuer: string;
  email: string | null;
  emailVerified: boolean;
  displayName: string | null;
}

export interface CurrentSession {
  id: string;
  createdAt: Date;
  expiresAt: Date;
  lastSeenAt: Date;
  authProvider: string;
  authenticatedAt: Date;
  isAdmin: boolean;
  mfaVerifiedAt: Date | null;
}

export function cookieOptions(ctx: AppContext) {
  return {
    httpOnly: true,
    secure: ctx.cfg.baseUrl.protocol === "https:",
    sameSite: "lax" as const,
    path: "/",
  };
}

export function clientIp(ctx: AppContext, req: FastifyRequest): string | null {
  if (!ctx.cfg.env.COLLECT_IP_ADDRESS) return null;
  return req.ip ?? null;
}

export function clientUserAgent(ctx: AppContext, req: FastifyRequest): string | null {
  if (!ctx.cfg.env.COLLECT_USER_AGENT) return null;
  const ua = req.headers["user-agent"];
  return typeof ua === "string" ? ua.slice(0, 512) : null;
}

export async function createSession(
  ctx: AppContext,
  req: FastifyRequest,
  reply: FastifyReply,
  user: CurrentUser,
  authenticatedAt: Date,
): Promise<CurrentSession> {
  const token = randomToken(32);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + ctx.cfg.env.SESSION_TTL_HOURS * 3600 * 1000);
  const isAdmin = Boolean(matchesAdminAllowlist(ctx.cfg.adminAllowlist, user));
  const [row] = await ctx.db
    .insert(sessions)
    .values({
      tokenHash: hashToken(token),
      userId: user.id,
      expiresAt,
      ipAddress: clientIp(ctx, req),
      userAgent: clientUserAgent(ctx, req),
      authProvider: user.provider,
      authenticatedAt,
      isAdmin,
    })
    .returning();
  reply.setCookie(SESSION_COOKIE, token, { ...cookieOptions(ctx), expires: expiresAt });
  return {
    id: row.id,
    createdAt: row.createdAt,
    expiresAt: row.expiresAt,
    lastSeenAt: row.lastSeenAt,
    authProvider: row.authProvider,
    authenticatedAt: row.authenticatedAt,
    isAdmin: row.isAdmin,
    mfaVerifiedAt: row.mfaVerifiedAt,
  };
}

/**
 * Loads and validates the session from the cookie: must exist, not be revoked,
 * not be past its absolute expiry, and not be idle longer than allowed
 * (stricter for admin sessions). Returns null for anonymous requests.
 */
export async function loadSession(ctx: AppContext, req: FastifyRequest, reply: FastifyReply): Promise<{ session: CurrentSession; user: CurrentUser } | null> {
  const token = req.cookies?.[SESSION_COOKIE];
  if (!token) return null;
  const rows = await ctx.db
    .select({ s: sessions, u: users })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(and(eq(sessions.tokenHash, hashToken(token)), isNull(sessions.revokedAt)))
    .limit(1);
  if (!rows.length) {
    reply.clearCookie(SESSION_COOKIE, cookieOptions(ctx));
    return null;
  }
  const { s, u } = rows[0];
  const now = Date.now();
  const idleLimitMin = s.isAdmin ? Math.min(ctx.cfg.env.ADMIN_SESSION_IDLE_MINUTES, ctx.cfg.env.SESSION_IDLE_MINUTES) : ctx.cfg.env.SESSION_IDLE_MINUTES;
  if (s.expiresAt.getTime() < now || now - s.lastSeenAt.getTime() > idleLimitMin * 60_000) {
    await ctx.db.update(sessions).set({ revokedAt: new Date() }).where(eq(sessions.id, s.id));
    reply.clearCookie(SESSION_COOKIE, cookieOptions(ctx));
    return null;
  }
  // Touch at most once a minute to keep writes low.
  if (now - s.lastSeenAt.getTime() > 60_000) {
    await ctx.db.update(sessions).set({ lastSeenAt: new Date() }).where(eq(sessions.id, s.id));
  }
  const user: CurrentUser = {
    id: u.id,
    provider: u.provider as "google" | "microsoft",
    providerSubject: u.providerSubject,
    providerIssuer: u.providerIssuer,
    email: u.email,
    emailVerified: u.emailVerified,
    displayName: u.displayName,
  };
  // Re-evaluate admin status against the live allowlist on every request so a
  // removed admin loses access immediately.
  const isAdmin = s.isAdmin && Boolean(matchesAdminAllowlist(ctx.cfg.adminAllowlist, user));
  return {
    session: {
      id: s.id,
      createdAt: s.createdAt,
      expiresAt: s.expiresAt,
      lastSeenAt: s.lastSeenAt,
      authProvider: s.authProvider,
      authenticatedAt: s.authenticatedAt,
      isAdmin,
      mfaVerifiedAt: s.mfaVerifiedAt,
    },
    user,
  };
}

export async function revokeSession(ctx: AppContext, sessionId: string, reply: FastifyReply): Promise<void> {
  await ctx.db.update(sessions).set({ revokedAt: new Date() }).where(eq(sessions.id, sessionId));
  reply.clearCookie(SESSION_COOKIE, cookieOptions(ctx));
}

export async function markMfaVerified(ctx: AppContext, sessionId: string): Promise<void> {
  await ctx.db.update(sessions).set({ mfaVerifiedAt: new Date() }).where(eq(sessions.id, sessionId));
}
