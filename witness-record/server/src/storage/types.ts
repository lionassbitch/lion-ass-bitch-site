import type { Readable } from "node:stream";

export interface DownloadUrlOptions {
  ttlSeconds: number;
  filename: string;
  contentType: string;
  /** "inline" lets the admin dashboard play video in the browser; "attachment" forces download. */
  disposition: "inline" | "attachment";
}

export interface StorageDriver {
  readonly kind: "local" | "s3";
  readonly description: string;
  readonly encryptionAtRest: string;
  putObject(key: string, body: Buffer, contentType: string): Promise<{ size: number }>;
  getObjectStream(key: string): Promise<Readable>;
  getObjectBuffer(key: string): Promise<Buffer>;
  headObject(key: string): Promise<{ size: number } | null>;
  deleteObject(key: string): Promise<void>;
  /** Begin a resumable upload. Returns an opaque reference persisted by the caller. */
  beginResumable(key: string, contentType: string): Promise<string>;
  /** Append the next sequential part. Returns the updated opaque reference. */
  appendPart(ref: string, partNumber: number, body: Buffer): Promise<string>;
  completeResumable(ref: string): Promise<{ size: number }>;
  abortResumable(ref: string): Promise<void>;
  /** Short-lived, authorized download URL. */
  createDownloadUrl(key: string, opts: DownloadUrlOptions): Promise<string>;
  healthCheck(): Promise<{ ok: boolean; detail: string }>;
}
