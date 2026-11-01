import type { Readable } from "node:stream";

export interface DownloadUrlOptions {
  ttlSeconds: number;
  filename: string;
  contentType: string;
  /** "inline" lets the admin dashboard play video in the browser; "attachment" forces download. */
  disposition: "inline" | "attachment";
}

export interface StoredPart {
  partNumber: number;
  size: number;
  etag: string | null;
}

export interface StorageDriver {
  readonly kind: "local" | "s3" | "unconfigured";
  readonly description: string;
  readonly encryptionAtRest: string;
  readonly configured: boolean;
  putObject(key: string, body: Buffer, contentType: string): Promise<{ size: number }>;
  getObjectStream(key: string): Promise<Readable>;
  getObjectBuffer(key: string): Promise<Buffer>;
  /** Inclusive byte range, used to sniff the real content type of a completed upload. */
  getObjectRange(key: string, start: number, end: number): Promise<Buffer>;
  headObject(key: string): Promise<{ size: number } | null>;
  deleteObject(key: string): Promise<void>;
  /** Begin a resumable (multipart) upload. Returns an opaque reference persisted by the caller. */
  beginResumable(key: string, contentType: string): Promise<string>;
  /** Server-side append of the next sequential part (proxy mode). Returns the updated reference. */
  appendPart(ref: string, partNumber: number, body: Buffer): Promise<string>;
  /** Short-lived URL the browser can PUT one part to directly (direct mode). */
  presignPartUrl(ref: string, partNumber: number, ttlSeconds: number): Promise<string>;
  /** Parts the storage has actually received, in part-number order. */
  listParts(ref: string): Promise<StoredPart[]>;
  completeResumable(ref: string): Promise<{ size: number }>;
  abortResumable(ref: string): Promise<void>;
  /** Short-lived, authorized download URL. */
  createDownloadUrl(key: string, opts: DownloadUrlOptions): Promise<string>;
  healthCheck(): Promise<{ ok: boolean; detail: string }>;
}
