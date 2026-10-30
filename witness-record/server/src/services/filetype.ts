import { fileTypeFromBuffer } from "file-type";

export const VIDEO_MIMES = new Set(["video/mp4", "video/webm", "video/quicktime", "video/x-matroska", "video/3gpp"]);
export const DOCUMENT_MIMES = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/heic",
  "image/heif",
  "image/webp",
  "image/gif",
  "text/plain",
]);

const EXT_FOR: Record<string, string> = {
  "video/mp4": "mp4",
  "video/webm": "webm",
  "video/quicktime": "mov",
  "video/x-matroska": "mkv",
  "video/3gpp": "3gp",
  "application/pdf": "pdf",
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/heic": "heic",
  "image/heif": "heif",
  "image/webp": "webp",
  "image/gif": "gif",
  "text/plain": "txt",
};

export function extensionFor(mime: string | null): string {
  return (mime && EXT_FOR[mime]) || "bin";
}

/**
 * Determines the real content type from magic bytes. Plain text is accepted
 * only when the buffer is valid UTF-8 without NUL bytes.
 */
export async function detectMime(head: Buffer): Promise<string | null> {
  const ft = await fileTypeFromBuffer(head);
  if (ft) {
    // file-type reports Matroska/WebM; browsers label MediaRecorder output video/webm.
    if (ft.mime === "video/x-matroska" || ft.mime === "video/webm") return head.includes(Buffer.from("webm")) ? "video/webm" : ft.mime;
    if (ft.mime === "video/mp4" || ft.mime === "video/quicktime" || ft.mime === "video/3gpp") return ft.mime;
    return ft.mime;
  }
  if (head.length > 0 && !head.includes(0) && isUtf8(head)) return "text/plain";
  return null;
}

function isUtf8(buf: Buffer): boolean {
  try {
    new TextDecoder("utf-8", { fatal: true }).decode(buf);
    return true;
  } catch {
    return false;
  }
}

export function isAllowedFor(kind: "video" | "document", mime: string | null): boolean {
  if (!mime) return false;
  return kind === "video" ? VIDEO_MIMES.has(mime) : DOCUMENT_MIMES.has(mime);
}
