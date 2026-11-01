import { api, ApiError } from "./api";

export interface UploadBegin {
  uploadId: string;
  mediaAssetId: string;
  chunkBytes: number;
  bytesReceived: number;
}

export interface UploadResult {
  mediaAssetId: string;
  sha256: string;
  sizeBytes: number;
  detectedMime: string;
  receivedAt: string;
  status: string;
  sourceType: string;
}

export interface UploadMeta {
  kind: "video" | "document";
  sourceType: "live_capture" | "uploaded_file";
  filename: string | null;
  declaredMime: string | null;
  description?: string | null;
  recordingConsent?: true;
}

const RESUME_KEY = (statementId: string, kind: string) => `wr.upload.${statementId}.${kind}`;

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Resumable chunked upload with retry. The server tells us exactly how many
 * bytes it has whenever we are out of sync, so interrupted uploads continue
 * from the last confirmed byte. Progress is reported after each chunk.
 */
export async function uploadResumable(
  statementId: string,
  blob: Blob,
  meta: UploadMeta,
  onProgress: (sent: number, total: number) => void,
  signal?: AbortSignal,
): Promise<UploadResult> {
  let begin: UploadBegin | null = null;
  // Try to resume a previous attempt for the same statement/kind and size.
  try {
    const saved = sessionStorage.getItem(RESUME_KEY(statementId, meta.kind));
    if (saved) {
      const parsed = JSON.parse(saved) as { uploadId: string; size: number; mediaAssetId: string; chunkBytes: number };
      if (parsed.size === blob.size) {
        const status = await api<{ status: string; bytesReceived: number; chunkBytes: number; mediaAssetId: string }>("GET", `/api/uploads/${parsed.uploadId}`);
        if (status.status === "open") begin = { uploadId: parsed.uploadId, mediaAssetId: status.mediaAssetId, chunkBytes: status.chunkBytes, bytesReceived: status.bytesReceived };
      }
    }
  } catch {
    begin = null;
  }
  if (!begin) {
    begin = await api<UploadBegin>("POST", `/api/statements/${statementId}/uploads`, { ...meta, declaredBytes: blob.size });
    try {
      sessionStorage.setItem(RESUME_KEY(statementId, meta.kind), JSON.stringify({ uploadId: begin.uploadId, size: blob.size, mediaAssetId: begin.mediaAssetId, chunkBytes: begin.chunkBytes }));
    } catch {
      /* ignore */
    }
  }
  let offset = begin.bytesReceived;
  onProgress(offset, blob.size);
  let attempt = 0;
  while (offset < blob.size) {
    if (signal?.aborted) throw new Error("aborted");
    const chunk = blob.slice(offset, Math.min(offset + begin.chunkBytes, blob.size));
    try {
      const r = await api<{ bytesReceived: number }>("PUT", `/api/uploads/${begin.uploadId}/chunk?offset=${offset}`, undefined, { raw: chunk, signal });
      offset = r.bytesReceived;
      attempt = 0;
      onProgress(offset, blob.size);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.code === "offset_mismatch" && err.details && typeof (err.details as { bytesReceived?: number }).bytesReceived === "number") {
          offset = (err.details as { bytesReceived: number }).bytesReceived;
          continue;
        }
        if (err.status >= 400 && err.status < 500 && err.status !== 429) throw err; // not retryable (type rejected, too large…)
      }
      attempt += 1;
      if (attempt > 6) throw err;
      await sleep(Math.min(1000 * 2 ** attempt, 15000));
      // Re-sync with the server before retrying.
      try {
        const status = await api<{ bytesReceived: number; status: string }>("GET", `/api/uploads/${begin.uploadId}`);
        if (status.status !== "open") throw err;
        offset = status.bytesReceived;
      } catch {
        /* keep offset */
      }
    }
  }
  const result = await api<UploadResult>("POST", `/api/uploads/${begin.uploadId}/complete`);
  try {
    sessionStorage.removeItem(RESUME_KEY(statementId, meta.kind));
  } catch {
    /* ignore */
  }
  return result;
}
