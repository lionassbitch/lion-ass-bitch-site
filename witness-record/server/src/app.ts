import Fastify, { type FastifyInstance, type FastifyReply, type FastifyRequest } from "fastify";
import fastifyCookie from "@fastify/cookie";
import fastifyHelmet from "@fastify/helmet";
import fastifyRateLimit from "@fastify/rate-limit";
import fastifyStatic from "@fastify/static";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ZodError } from "zod";
import type { AppContext } from "./context.js";
import { HttpError } from "./context.js";
import { loadSession, type CurrentSession, type CurrentUser } from "./auth/session.js";
import { registerAuthRoutes } from "./routes/auth.js";
import { registerPublicRoutes } from "./routes/public.js";
import { registerWitnessRoutes } from "./routes/witness.js";
import { registerMediaRoutes } from "./routes/media.js";
import { registerAdminRoutes } from "./routes/admin.js";

declare module "fastify" {
  interface FastifyRequest {
    auth: { session: CurrentSession; user: CurrentUser } | null;
    ctx: AppContext;
  }
}

const here = path.dirname(fileURLToPath(import.meta.url));

export function clientDistDir(): string | null {
  const candidates = [path.resolve(here, "../client"), path.resolve(here, "../../dist/client"), path.resolve(process.cwd(), "dist/client")];
  for (const c of candidates) if (fs.existsSync(path.join(c, "index.html"))) return c;
  return null;
}

export async function buildApp(ctx: AppContext): Promise<FastifyInstance> {
  const app = Fastify({
    loggerInstance: ctx.log as unknown as import("fastify").FastifyBaseLogger,
    trustProxy: ctx.cfg.env.TRUST_PROXY,
    routerOptions: { maxParamLength: 1024 },
    bodyLimit: Math.max(ctx.cfg.env.UPLOAD_CHUNK_BYTES + 64 * 1024, 3 * 1024 * 1024),
  });
  ctx.log = app.log;

  app.decorateRequest("auth", null as never);
  app.decorateRequest("ctx", null as never);

  await app.register(fastifyCookie);
  await app.register(fastifyHelmet, {
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        "default-src": ["'self'"],
        "script-src": ["'self'"],
        "style-src": ["'self'", "'unsafe-inline'"],
        "img-src": ["'self'", "data:", "blob:"],
        "media-src": ["'self'", "blob:", "https:"],
        "connect-src": ["'self'", "https:"],
        "frame-ancestors": ["'none'"],
        "form-action": ["'self'"],
        "object-src": ["'none'"],
        "base-uri": ["'self'"],
      },
    },
    referrerPolicy: { policy: "no-referrer" },
    crossOriginEmbedderPolicy: false,
    hsts: ctx.cfg.baseUrl.protocol === "https:" ? { maxAge: 31536000, includeSubDomains: true } : false,
  });
  await app.register(fastifyRateLimit, {
    global: true,
    max: 600,
    timeWindow: "1 minute",
    keyGenerator: (req) => req.ip,
    errorResponseBuilder: () => ({ statusCode: 429, error: "rate_limited", message: "Too many requests. Please wait a moment and try again." }),
  });

  // Raw bytes for upload chunks.
  app.addContentTypeParser("application/octet-stream", { parseAs: "buffer", bodyLimit: ctx.cfg.env.UPLOAD_CHUNK_BYTES + 1024 }, (_req, body, done) => done(null, body));

  app.addHook("onRequest", async (req, reply) => {
    req.ctx = ctx;
    req.auth = null;
    const url = req.raw.url ?? "";
    if (url.startsWith("/api/") || url.startsWith("/auth/")) {
      reply.header("Cache-Control", "no-store");
      reply.header("X-Robots-Tag", "noindex, nofollow, noarchive");
      req.auth = await loadSession(ctx, req, reply);
    }
  });

  // CSRF: state-changing API calls must come from our own origin and carry a
  // custom header that simple cross-site forms cannot set. Cookies are
  // SameSite=Lax as a second layer.
  app.addHook("preHandler", async (req) => {
    const url = req.raw.url ?? "";
    if (!url.startsWith("/api/")) return;
    if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return;
    // Signed, single-use-style upload-part links carry their own credential (the
    // HMAC token) and no cookie is consulted, exactly like a presigned bucket URL.
    if (url.startsWith("/api/files/part/")) return;
    const origin = req.headers.origin ?? (req.headers.referer ? safeOrigin(req.headers.referer) : null);
    if (!origin || origin !== ctx.cfg.baseUrl.origin) throw new HttpError(403, "Cross-site request rejected.", "csrf_origin");
    if (req.headers["x-requested-with"] !== "XMLHttpRequest") throw new HttpError(403, "Missing request header.", "csrf_header");
  });

  app.setErrorHandler((err: unknown, req: FastifyRequest, reply: FastifyReply) => {
    if (err instanceof HttpError) {
      return reply.status(err.statusCode).send({ error: err.code, message: err.message, details: err.details ?? undefined });
    }
    if (err instanceof ZodError) {
      return reply.status(400).send({ error: "validation", message: "Some answers are missing or invalid.", details: err.issues.map((i) => ({ path: i.path.join("."), message: i.message })) });
    }
    const e = err as { statusCode?: number; code?: string; message?: string; validation?: unknown };
    if (e.statusCode === 429) return reply.status(429).send({ error: "rate_limited", message: "Too many requests. Please wait a moment and try again." });
    if (e.statusCode === 413 || e.code === "FST_ERR_CTP_BODY_TOO_LARGE") return reply.status(413).send({ error: "too_large", message: "The request body is too large." });
    if (e.statusCode === 415) return reply.status(415).send({ error: "unsupported_media_type", message: "Unsupported content type." });
    if (e.code === "FST_ERR_CTP_INVALID_MEDIA_TYPE" || e.code === "FST_ERR_CTP_EMPTY_JSON_BODY") return reply.status(400).send({ error: "bad_request", message: "Malformed request." });
    if (typeof e.message === "string" && e.message.includes("witness_record:")) {
      return reply.status(409).send({ error: "immutable", message: "Finalized evidence cannot be modified." });
    }
    req.log.error({ err }, "unhandled error");
    return reply.status(500).send({ error: "internal", message: "An unexpected error occurred. Nothing you submitted was lost; please try again." });
  });

  await registerPublicRoutes(app, ctx);
  await registerAuthRoutes(app, ctx);
  await registerWitnessRoutes(app, ctx);
  await registerMediaRoutes(app, ctx);
  await registerAdminRoutes(app, ctx);

  // Static client + SPA fallback. API/auth paths never fall through to HTML.
  const dist = clientDistDir();
  if (dist) {
    await app.register(fastifyStatic, { root: dist, prefix: "/", wildcard: false, index: false, setHeaders: (reply, p) => { if (p.endsWith(".html")) reply.header("Cache-Control", "no-store"); } });
  }
  app.setNotFoundHandler((req, reply) => {
    const url = req.raw.url ?? "";
    if (url.startsWith("/api/") || url.startsWith("/auth/")) return reply.status(404).send({ error: "not_found", message: "Not found." });
    if (req.method !== "GET" || !dist) return reply.status(404).send({ error: "not_found", message: "Not found." });
    reply.header("Cache-Control", "no-store");
    reply.header("X-Robots-Tag", "noindex, nofollow, noarchive");
    return reply.type("text/html").send(fs.createReadStream(path.join(dist, "index.html")));
  });

  return app;
}

function safeOrigin(ref: string): string | null {
  try {
    return new URL(ref).origin;
  } catch {
    return null;
  }
}

export function requireAuth(req: FastifyRequest): { session: CurrentSession; user: CurrentUser } {
  if (!req.auth) throw new HttpError(401, "Please sign in to continue.", "unauthenticated");
  return req.auth;
}
