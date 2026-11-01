import { api, ApiError } from "./api";

export interface UploadBegin {
  uploadId: string;
  mediaAssetId: string;
  chunkBytes: number;
  bytesReceived: number;
  mode: "direct" | "proxy";
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

interface UploadStatus {
  status: string;
  mode: "direct" | "proxy";
  bytesReceived: number;
  partsReceived: number;
  chunkBytes: number;
  mediaAssetId: string;
}

const RESUME_KEY = (statementId: string, kind: string) => `wr.upload.${statementId}.${kind}`;

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Resumable chunked upload with retry.
 *
 * direct mode: each part is PUT by the browser straight to a short-lived
 * presigned URL on the private bucket (the server never proxies the bytes).
 * proxy mode: parts are PUT to the server, which appends them.
 *
 * Either way the server tells us exactly what it has whenever we are out of
 * sync, so interrupted uploads continue from the last stored part.
 */
export async function uploadResumable(
  statementId: string,
  blob: Blob,
  meta: UploadMeta,
  onProgress: (sent: number, total: number) => void,
  signal?: AbortSignal,
): Promise<UploadResult> {
  let begin: UploadBegin | null = null;
  // Resume a previous attempt for the same statement/kind and size, if the server still has it open.
  try {
    const saved = sessionStorage.getItem(RESUME_KEY(statementId, meta.kind));
    if (saved) {
      const parsed = JSON.parse(saved) as { uploadId: string; size: number };
      if (parsed.size === blob.size) {
        const st = await api<UploadStatus>("GET", `/api/uploads/${parsed.uploadId}`);
        if (st.status === "open") begin = { uploadId: parsed.uploadId, mediaAssetId: st.mediaAssetId, chunkBytes: st.chunkBytes, bytesReceived: st.bytesReceived, mode: st.mode };
      }
    }
  } catch {
    begin = null;
  }
  if (!begin) {
    begin = await api<UploadBegin>("POST", `/api/statements/${statementId}/uploads`, { ...meta, declaredBytes: blob.size });
    try {
      sessionStorage.setItem(RESUME_KEY(statementId, meta.kind), JSON.stringify({ uploadId: begin.uploadId, size: blob.size }));
    } catch {
      /* ignore */
    }
  }
  const total = blob.size;
  const chunk = begin.chunkBytes;
  let offset = begin.bytesReceived;
  onProgress(offset, total);
  let attempt = 0;

  const resync = async () => {
    const st = await api<UploadStatus>("GET", `/api/uploads/${begin!.uploadId}`);
    if (st.status !== "open") throw new ApiError(409, "upload_closed", "Upload is no longer open.");
    offset = st.bytesReceived;
  };

  while (offset < total) {
    if (signal?.aborted) throw new Error("aborted");
    const part = blob.slice(offset, Math.min(offset + chunk, total));
    const partNumber = Math.floor(offset / chunk) + 1;
    try {
      if (begin.mode === "direct") {
        const grant = await api<{ url: string }>("POST", `/api/uploads/${begin.uploadId}/parts`, { partNumber });
        const res = await fetch(grant.url, { method: "PUT", body: part, signal, headers: { "Content-Type": "application/octet-stream" } });
        if (!res.ok) throw new ApiError(res.status, "part_upload_failed", `Storage rejected part ${partNumber} (${res.status}).`);
        offset += part.size;
      } else {
        const r = await api<{ bytesReceived: number }>("PUT", `/api/uploads/${begin.uploadId}/chunk?offset=${offset}`, undefined, { raw: part, signal });
        offset = r.bytesReceived;
      }
      attempt = 0;
      onProgress(offset, total);
    } catch (err) {
      if (signal?.aborted) throw err;
      if (err instanceof ApiError) {
        const d = err.details as { bytesReceived?: number } | undefined;
        if ((err.code === "offset_mismatch" || err.code === "part_mismatch") && typeof d?.bytesReceived === "number") {
          offset = d.bytesReceived;
          continue;
        }
        if (err.status >= 400 && err.status < 500 && err.status !== 429 && err.status !== 408 && err.code !== "part_upload_failed") throw err; // not retryable (type rejected, too large…)
      }
      attempt += 1;
      if (attempt > 6) throw err;
      await sleep(Math.min(1000 * 2 ** attempt, 15000));
      try {
        await resync();
      } catch (e) {
        if (e instanceof ApiError && e.code === "upload_closed") throw e;
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
