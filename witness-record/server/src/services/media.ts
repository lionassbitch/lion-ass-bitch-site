import { and, eq } from "drizzle-orm";
import type { FastifyRequest } from "fastify";
import { z } from "zod";
import type { AppContext } from "../context.js";
import { HttpError } from "../context.js";
import { mediaAssets, uploadSessions } from "../db/schema.js";
import { sha256Stream } from "../lib/crypto.js";
import { clientIp, clientUserAgent, type CurrentSession, type CurrentUser } from "../auth/session.js";
import { detectMime, isAllowedFor } from "./filetype.js";
import type { MediaRow, StatementRow } from "./statements.js";
import { dict } from "../i18n/index.js";

export const beginUploadSchema = z.object({
  kind: z.enum(["video", "document"]),
  sourceType: z.enum(["live_capture", "uploaded_file"]),
  filename: z.string().trim().max(255).nullable().default(null),
  declaredMime: z.string().trim().max(120).nullable().default(null),
  declaredBytes: z.number().int().positive(),
  description: z.string().trim().max(1000).nullable().default(null),
  recordingConsent: z.literal(true).optional(),
});

export type UploadRow = typeof uploadSessions.$inferSelect;
const PART_URL_TTL_SECONDS = 15 * 60;

/**
 * Resumable, chunked uploads of original witness media.
 *
 * Two transports, same guarantees:
 *  - direct: the browser PUTs each part to a short-lived presigned URL on the
 *    private bucket; the server never touches the bytes in flight.
 *  - proxy:  parts are appended through this server.
 *
 * In both cases the storage service is the source of truth for which parts
 * exist. On completion the stored object is re-read to compute the
 * authoritative SHA-256 and size, its first bytes are sniffed for the real
 * content type, and everything is frozen with the server receipt time.
 * Nothing is transcoded, trimmed or otherwise modified.
 */
export class MediaService {
  constructor(private readonly ctx: AppContext) {}

  private meta(req: FastifyRequest) {
    return { ipAddress: clientIp(this.ctx, req), userAgent: clientUserAgent(this.ctx, req) };
  }

  get mode(): "direct" | "proxy" {
    return this.ctx.cfg.env.UPLOAD_MODE;
  }

  async begin(req: FastifyRequest, st: StatementRow, user: CurrentUser, session: CurrentSession, rawInput: unknown) {
    if (st.status !== "draft") throw new HttpError(409, "This statement is finalized.", "finalized");
    if (!this.ctx.storage.configured) throw new HttpError(503, "File storage is not configured yet.", "storage_unconfigured");
    const input = beginUploadSchema.parse(rawInput);
    const max = input.kind === "video" ? this.ctx.cfg.env.MAX_VIDEO_BYTES : this.ctx.cfg.env.MAX_DOCUMENT_BYTES;
    if (input.declaredBytes > max) throw new HttpError(413, `File exceeds the maximum size of ${max} bytes.`, "too_large", { max });
    const existing = await this.ctx.db
      .select()
      .from(mediaAssets)
      .where(and(eq(mediaAssets.statementId, st.id), eq(mediaAssets.kind, input.kind), eq(mediaAssets.status, "complete")));
    if (input.kind === "video" && existing.length > 0) throw new HttpError(409, "A video is already attached. Remove it before adding another.", "video_exists");
    if (input.kind === "document" && existing.length >= this.ctx.cfg.env.MAX_DOCUMENTS_PER_STATEMENT) throw new HttpError(409, "Maximum number of documents reached.", "document_limit");
    if (input.kind === "video" && input.recordingConsent !== true) throw new HttpError(400, "Recording and disclosure permission is required for video.", "consent_required");

    // Abort any stale open upload of the same kind so staging space is reclaimed.
    const stale = await this.ctx.db
      .select()
      .from(mediaAssets)
      .where(and(eq(mediaAssets.statementId, st.id), eq(mediaAssets.kind, input.kind), eq(mediaAssets.status, "uploading")));
    for (const s of stale) await this.abortAsset(s).catch(() => {});

    const t = dict(st.language);
    const chunkBytes = this.ctx.cfg.env.UPLOAD_CHUNK_BYTES;
    const [asset] = await this.ctx.db
      .insert(mediaAssets)
      .values({
        statementId: st.id,
        userId: user.id,
        kind: input.kind,
        sourceType: input.sourceType,
        originalFilename: input.filename,
        declaredMime: input.declaredMime,
        storageKey: "pending",
        status: "uploading",
        scanStatus: this.ctx.scanner.configured ? "pending" : "not_configured",
        description: input.description,
        recordingConsent: input.kind === "video" ? { acceptedAt: new Date().toISOString(), text: t.video.consentText } : null,
      })
      .returning();
    const storageKey = `statements/${st.id}/${input.kind}/${asset.id}`;
    const ref = await this.ctx.storage.beginResumable(storageKey, input.declaredMime ?? "application/octet-stream");
    await this.ctx.db.update(mediaAssets).set({ storageKey }).where(eq(mediaAssets.id, asset.id));
    const [upload] = await this.ctx.db
      .insert(uploadSessions)
      .values({
        mediaAssetId: asset.id,
        userId: user.id,
        storageUploadRef: ref,
        declaredBytes: input.declaredBytes,
        chunkBytes,
        mode: this.mode,
        expiresAt: new Date(Date.now() + 24 * 3600 * 1000),
      })
      .returning();
    await this.ctx.audit.record({
      actorType: "witness",
      actorUserId: user.id,
      sessionId: session.id,
      statementId: st.id,
      mediaAssetId: asset.id,
      action: "media.upload_started",
      detail: { kind: input.kind, sourceType: input.sourceType, declaredBytes: input.declaredBytes, declaredMime: input.declaredMime, filename: input.filename, mode: this.mode, storage: this.ctx.storage.kind },
      ...this.meta(req),
    });
    return { uploadId: upload.id, mediaAssetId: asset.id, chunkBytes, bytesReceived: 0, mode: this.mode };
  }

  async getUpload(uploadId: string, userId: string): Promise<{ upload: UploadRow; asset: MediaRow }> {
    const [upload] = await this.ctx.db.select().from(uploadSessions).where(and(eq(uploadSessions.id, uploadId), eq(uploadSessions.userId, userId))).limit(1);
    if (!upload) throw new HttpError(404, "Upload not found.", "not_found");
    const [asset] = await this.ctx.db.select().from(mediaAssets).where(eq(mediaAssets.id, upload.mediaAssetId)).limit(1);
    return { upload, asset };
  }

  /** Progress as the storage service sees it (direct mode) or as recorded by the server (proxy mode). */
  private async received(upload: UploadRow): Promise<{ bytes: number; parts: number }> {
    if (upload.mode === "direct" && upload.status === "open") {
      const parts = await this.ctx.storage.listParts(upload.storageUploadRef!);
      // Only count a contiguous prefix of parts; the client resumes from there.
      let bytes = 0;
      let n = 0;
      for (const p of parts) {
        if (p.partNumber !== n + 1) break;
        bytes += p.size;
        n += 1;
      }
      return { bytes, parts: n };
    }
    return { bytes: Number(upload.bytesReceived), parts: upload.partsReceived };
  }

  async status(uploadId: string, userId: string) {
    const { upload, asset } = await this.getUpload(uploadId, userId);
    const r = await this.received(upload);
    return { uploadId: upload.id, mediaAssetId: asset.id, status: upload.status, mode: upload.mode, bytesReceived: r.bytes, partsReceived: r.parts, declaredBytes: Number(upload.declaredBytes), chunkBytes: upload.chunkBytes };
  }

  /** Direct mode: a short-lived URL for exactly the next part. */
  async presignPart(uploadId: string, user: CurrentUser, partNumber: number) {
    const { upload } = await this.getUpload(uploadId, user.id);
    if (upload.mode !== "direct") throw new HttpError(409, "This upload uses the server transport.", "wrong_mode");
    if (upload.status !== "open") throw new HttpError(409, "Upload is not open.", "upload_closed");
    if (upload.expiresAt.getTime() < Date.now()) throw new HttpError(410, "Upload expired.", "upload_expired");
    const r = await this.received(upload);
    if (partNumber !== r.parts + 1) throw new HttpError(409, `Next expected part is ${r.parts + 1}.`, "part_mismatch", { partsReceived: r.parts, bytesReceived: r.bytes });
    const maxParts = Math.ceil(Number(upload.declaredBytes) / upload.chunkBytes);
    if (partNumber > maxParts) throw new HttpError(413, "More parts than declared.", "size_exceeded");
    const url = await this.ctx.storage.presignPartUrl(upload.storageUploadRef!, partNumber, PART_URL_TTL_SECONDS);
    return { partNumber, url, expiresInSeconds: PART_URL_TTL_SECONDS, maxBytes: upload.chunkBytes };
  }

  /** Proxy mode: the server appends the next sequential chunk. */
  async appendChunk(req: FastifyRequest, uploadId: string, user: CurrentUser, offset: number, body: Buffer) {
    const { upload, asset } = await this.getUpload(uploadId, user.id);
    if (upload.mode !== "proxy") throw new HttpError(409, "This upload uses direct-to-storage transport.", "wrong_mode");
    if (upload.status !== "open") throw new HttpError(409, "Upload is not open.", "upload_closed");
    if (upload.expiresAt.getTime() < Date.now()) throw new HttpError(410, "Upload expired.", "upload_expired");
    const received = Number(upload.bytesReceived);
    if (offset !== received) throw new HttpError(409, `Unexpected offset ${offset}; next expected ${received}.`, "offset_mismatch", { bytesReceived: received });
    if (body.length === 0) throw new HttpError(400, "Empty chunk.", "empty_chunk");
    if (body.length > upload.chunkBytes) throw new HttpError(413, "Chunk too large.", "chunk_too_large");
    if (received + body.length > Number(upload.declaredBytes)) throw new HttpError(413, "More bytes than declared.", "size_exceeded");
    if (received === 0) {
      const detected = await detectMime(body.subarray(0, 4100));
      if (!isAllowedFor(asset.kind as "video" | "document", detected)) {
        await this.markRejected(asset, upload, `unsupported content type: ${detected ?? "unknown"}`);
        throw new HttpError(415, "That file type is not accepted.", "unsupported_type", { detected });
      }
      await this.ctx.db.update(mediaAssets).set({ detectedMime: detected }).where(eq(mediaAssets.id, asset.id));
    }
    const partNumber = upload.partsReceived + 1;
    let newRef: string;
    try {
      newRef = await this.ctx.storage.appendPart(upload.storageUploadRef!, partNumber, body);
    } catch (err) {
      await this.ctx.db.update(uploadSessions).set({ status: "failed", updatedAt: new Date() }).where(eq(uploadSessions.id, upload.id));
      throw new HttpError(500, "Storage write failed.", "storage_error", { cause: String(err) });
    }
    const [updated] = await this.ctx.db
      .update(uploadSessions)
      .set({ storageUploadRef: newRef, bytesReceived: received + body.length, partsReceived: partNumber, updatedAt: new Date() })
      .where(eq(uploadSessions.id, upload.id))
      .returning();
    return { bytesReceived: Number(updated.bytesReceived), declaredBytes: Number(updated.declaredBytes), complete: Number(updated.bytesReceived) === Number(updated.declaredBytes) };
  }

  async complete(req: FastifyRequest, uploadId: string, user: CurrentUser, session: CurrentSession) {
    const { upload, asset } = await this.getUpload(uploadId, user.id);
    if (upload.status === "completed") return publicUploadResult(asset);
    if (upload.status !== "open") throw new HttpError(409, "Upload is not open.", "upload_closed");
    const declared = Number(upload.declaredBytes);
    const r = await this.received(upload);
    if (r.bytes !== declared) throw new HttpError(409, "Upload is incomplete.", "incomplete", { bytesReceived: r.bytes, partsReceived: r.parts });
    const { size } = await this.ctx.storage.completeResumable(upload.storageUploadRef!);
    if (size !== declared) {
      await this.markRejected(asset, upload, `stored size ${size} differs from declared ${declared}`, true);
      throw new HttpError(500, "Stored file size does not match the declared size.", "size_mismatch");
    }
    // Direct mode never saw the bytes: sniff the real type now from the stored object.
    let detectedMime = asset.detectedMime;
    if (!detectedMime) {
      const head = await this.ctx.storage.getObjectRange(asset.storageKey, 0, Math.min(4099, declared - 1));
      detectedMime = await detectMime(head);
      if (!isAllowedFor(asset.kind as "video" | "document", detectedMime)) {
        await this.markRejected(asset, upload, `unsupported content type: ${detectedMime ?? "unknown"}`, true);
        throw new HttpError(415, "That file type is not accepted.", "unsupported_type", { detected: detectedMime });
      }
    }
    const stream = await this.ctx.storage.getObjectStream(asset.storageKey);
    const { sha256, size: hashedSize } = await sha256Stream(stream);
    if (hashedSize !== declared) {
      await this.markRejected(asset, upload, `hashed size ${hashedSize} differs from declared ${declared}`, true);
      throw new HttpError(500, "Stored file size does not match the declared size.", "size_mismatch");
    }
    const receivedAt = new Date();
    let scanStatus: MediaRow["scanStatus"] = "not_configured";
    let scanDetail: string | null = null;
    if (this.ctx.scanner.configured) {
      const buf = await this.ctx.storage.getObjectBuffer(asset.storageKey);
      const result = await this.ctx.scanner.scan(buf);
      scanStatus = result.status;
      scanDetail = result.detail;
    }
    await this.ctx.db.transaction(async (tx) => {
      await tx
        .update(mediaAssets)
        .set({ status: "complete", sha256, sizeBytes: hashedSize, receivedAt, scanStatus, scanDetail, detectedMime })
        .where(eq(mediaAssets.id, asset.id));
      await tx.update(uploadSessions).set({ status: "completed", bytesReceived: hashedSize, partsReceived: r.parts, updatedAt: receivedAt }).where(eq(uploadSessions.id, upload.id));
      await this.ctx.audit.record(
        {
          actorType: "witness",
          actorUserId: user.id,
          sessionId: session.id,
          statementId: asset.statementId,
          mediaAssetId: asset.id,
          action: "media.upload_completed",
          detail: { kind: asset.kind, sourceType: asset.sourceType, sha256, sizeBytes: hashedSize, detectedMime, receivedAtUtc: receivedAt.toISOString(), storageKey: asset.storageKey, scanStatus, parts: r.parts, mode: upload.mode, storage: this.ctx.storage.kind },
          ...this.meta(req),
        },
        tx as unknown as AppContext["db"],
      );
    });
    const [fresh] = await this.ctx.db.select().from(mediaAssets).where(eq(mediaAssets.id, asset.id)).limit(1);
    return publicUploadResult(fresh);
  }

  private async markRejected(asset: MediaRow, upload: UploadRow, reason: string, objectExists = false) {
    if (objectExists) await this.ctx.storage.deleteObject(asset.storageKey).catch(() => {});
    else await this.ctx.storage.abortResumable(upload.storageUploadRef!).catch(() => {});
    await this.ctx.db.update(uploadSessions).set({ status: "aborted", updatedAt: new Date() }).where(eq(uploadSessions.id, upload.id));
    await this.ctx.db.update(mediaAssets).set({ status: "rejected", scanDetail: reason }).where(eq(mediaAssets.id, asset.id));
    await this.ctx.audit.record({ actorType: "system", statementId: asset.statementId, mediaAssetId: asset.id, action: "media.rejected", detail: { reason } });
  }

  private async abortAsset(asset: MediaRow) {
    const [upload] = await this.ctx.db.select().from(uploadSessions).where(eq(uploadSessions.mediaAssetId, asset.id)).limit(1);
    if (upload?.storageUploadRef) await this.ctx.storage.abortResumable(upload.storageUploadRef).catch(() => {});
    if (upload) await this.ctx.db.update(uploadSessions).set({ status: "aborted", updatedAt: new Date() }).where(eq(uploadSessions.id, upload.id));
    await this.ctx.db.update(mediaAssets).set({ status: "rejected", scanDetail: "superseded by a new upload" }).where(eq(mediaAssets.id, asset.id));
  }

  /** Witness removes a file before signing (retake / change of mind). The bytes are deleted; the audit trail keeps the hash. */
  async remove(req: FastifyRequest, st: StatementRow, mediaId: string, user: CurrentUser, session: CurrentSession) {
    if (st.status !== "draft") throw new HttpError(409, "This statement is finalized.", "finalized");
    const [asset] = await this.ctx.db.select().from(mediaAssets).where(and(eq(mediaAssets.id, mediaId), eq(mediaAssets.statementId, st.id))).limit(1);
    if (!asset) throw new HttpError(404, "File not found.", "not_found");
    if (asset.kind !== "video" && asset.kind !== "document") throw new HttpError(400, "Not removable.", "not_removable");
    if (asset.status === "uploading") await this.abortAsset(asset);
    else if (asset.status === "complete") {
      await this.ctx.storage.deleteObject(asset.storageKey).catch(() => {});
      await this.ctx.db.update(mediaAssets).set({ status: "removed_before_signing" }).where(eq(mediaAssets.id, asset.id));
    }
    await this.ctx.audit.record({
      actorType: "witness",
      actorUserId: user.id,
      sessionId: session.id,
      statementId: st.id,
      mediaAssetId: asset.id,
      action: "media.removed_before_signing",
      detail: { kind: asset.kind, sha256: asset.sha256, previousStatus: asset.status },
      ...this.meta(req),
    });
  }

  async getAsset(mediaId: string): Promise<MediaRow> {
    const [asset] = await this.ctx.db.select().from(mediaAssets).where(eq(mediaAssets.id, mediaId)).limit(1);
    if (!asset) throw new HttpError(404, "File not found.", "not_found");
    return asset;
  }
}

export function publicUploadResult(asset: MediaRow) {
  return {
    mediaAssetId: asset.id,
    kind: asset.kind,
    status: asset.status,
    sha256: asset.sha256,
    sizeBytes: asset.sizeBytes,
    detectedMime: asset.detectedMime,
    receivedAt: asset.receivedAt?.toISOString() ?? null,
    scanStatus: asset.scanStatus,
    sourceType: asset.sourceType,
    originalFilename: asset.originalFilename,
    description: asset.description,
  };
}
