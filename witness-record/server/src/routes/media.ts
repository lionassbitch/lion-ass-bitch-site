import type { FastifyInstance } from "fastify";
import type { AppContext } from "../context.js";
import { HttpError } from "../context.js";
import { requireAuth } from "../app.js";
import { MediaService } from "../services/media.js";
import { StatementService } from "../services/statements.js";

export async function registerMediaRoutes(app: FastifyInstance, ctx: AppContext) {
  const statements = new StatementService(ctx);
  const media = new MediaService(ctx);

  app.post<{ Params: { id: string } }>("/api/statements/:id/uploads", { config: { rateLimit: { max: 30, timeWindow: "1 minute" } } }, async (req, reply) => {
    const { session, user } = requireAuth(req);
    const st = await statements.getOwned(user.id, req.params.id);
    reply.status(201);
    return media.begin(req, st, user, session, req.body);
  });

  app.get<{ Params: { uploadId: string } }>("/api/uploads/:uploadId", async (req) => {
    const { user } = requireAuth(req);
    return media.status(req.params.uploadId, user.id);
  });

  app.put<{ Params: { uploadId: string }; Querystring: { offset?: string } }>(
    "/api/uploads/:uploadId/chunk",
    { config: { rateLimit: { max: 1200, timeWindow: "1 minute" } } },
    async (req) => {
      const { user } = requireAuth(req);
      const offset = Number(req.query.offset);
      if (!Number.isInteger(offset) || offset < 0) throw new HttpError(400, "offset query parameter required.", "bad_offset");
      if (!Buffer.isBuffer(req.body)) throw new HttpError(415, "Send chunks as application/octet-stream.", "unsupported_media_type");
      return media.appendChunk(req, req.params.uploadId, user, offset, req.body);
    },
  );

  app.post<{ Params: { uploadId: string } }>("/api/uploads/:uploadId/complete", async (req) => {
    const { session, user } = requireAuth(req);
    return media.complete(req, req.params.uploadId, user, session);
  });

  app.delete<{ Params: { id: string; mediaId: string } }>("/api/statements/:id/media/:mediaId", async (req) => {
    const { session, user } = requireAuth(req);
    const st = await statements.getOwned(user.id, req.params.id);
    await media.remove(req, st, req.params.mediaId, user, session);
    return { ok: true };
  });
}
