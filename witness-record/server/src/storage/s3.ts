import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  DeleteObjectCommand,
  CreateMultipartUploadCommand,
  UploadPartCommand,
  ListPartsCommand,
  CompleteMultipartUploadCommand,
  AbortMultipartUploadCommand,
  HeadBucketCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type { Readable } from "node:stream";
import type { DownloadUrlOptions, StorageDriver, StoredPart } from "./types.js";

interface S3Ref {
  key: string;
  uploadId: string;
  parts: { PartNumber: number; ETag: string }[];
}

export interface S3Options {
  bucket: string;
  region: string;
  endpoint?: string;
  accessKeyId: string;
  secretAccessKey: string;
  forcePathStyle: boolean;
  sse?: string; // AES256 | aws:kms | ""
}

/**
 * S3-compatible driver (AWS S3, Cloudflare R2, Supabase Storage, Backblaze B2,
 * MinIO…). Uploads use native multipart uploads: either appended by the server
 * (proxy mode) or PUT by the browser to presigned part URLs (direct mode, which
 * keeps large files off hosts with small request-body limits). Parts are read
 * back from the storage service with ListParts before completion, so storage
 * is the source of truth. Download links are presigned GET URLs that expire.
 */
export class S3StorageDriver implements StorageDriver {
  readonly kind = "s3" as const;
  readonly configured = true;
  readonly description: string;
  readonly encryptionAtRest: string;
  private readonly client: S3Client;

  constructor(private readonly opts: S3Options) {
    this.client = new S3Client({
      region: opts.region,
      endpoint: opts.endpoint || undefined,
      forcePathStyle: opts.forcePathStyle,
      credentials: { accessKeyId: opts.accessKeyId, secretAccessKey: opts.secretAccessKey },
    });
    this.description = `S3-compatible bucket "${opts.bucket}"${opts.endpoint ? ` at ${opts.endpoint}` : ` (${opts.region})`}`;
    this.encryptionAtRest = opts.sse ? `Server-side encryption requested on upload (${opts.sse}); bucket policy should also enforce it.` : "No SSE header sent; rely on the storage provider's default encryption at rest.";
  }

  private sse(): { ServerSideEncryption?: "AES256" | "aws:kms" } {
    if (this.opts.sse === "AES256" || this.opts.sse === "aws:kms") return { ServerSideEncryption: this.opts.sse };
    return {};
  }

  async putObject(key: string, body: Buffer, contentType: string): Promise<{ size: number }> {
    await this.client.send(new PutObjectCommand({ Bucket: this.opts.bucket, Key: key, Body: body, ContentType: contentType, ...this.sse() }));
    return { size: body.length };
  }

  async getObjectStream(key: string): Promise<Readable> {
    const res = await this.client.send(new GetObjectCommand({ Bucket: this.opts.bucket, Key: key }));
    return res.Body as Readable;
  }

  async getObjectBuffer(key: string): Promise<Buffer> {
    const res = await this.client.send(new GetObjectCommand({ Bucket: this.opts.bucket, Key: key }));
    return Buffer.from(await res.Body!.transformToByteArray());
  }

  async getObjectRange(key: string, start: number, end: number): Promise<Buffer> {
    const res = await this.client.send(new GetObjectCommand({ Bucket: this.opts.bucket, Key: key, Range: `bytes=${start}-${end}` }));
    return Buffer.from(await res.Body!.transformToByteArray());
  }

  async headObject(key: string): Promise<{ size: number } | null> {
    try {
      const res = await this.client.send(new HeadObjectCommand({ Bucket: this.opts.bucket, Key: key }));
      return { size: res.ContentLength ?? 0 };
    } catch (err) {
      const e = err as { name?: string; $metadata?: { httpStatusCode?: number } };
      if (e.name === "NotFound" || e.$metadata?.httpStatusCode === 404) return null;
      throw err;
    }
  }

  async deleteObject(key: string): Promise<void> {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.opts.bucket, Key: key }));
  }

  async beginResumable(key: string, contentType: string): Promise<string> {
    const res = await this.client.send(new CreateMultipartUploadCommand({ Bucket: this.opts.bucket, Key: key, ContentType: contentType, ...this.sse() }));
    const ref: S3Ref = { key, uploadId: res.UploadId!, parts: [] };
    return JSON.stringify(ref);
  }

  async appendPart(refStr: string, partNumber: number, body: Buffer): Promise<string> {
    const ref = JSON.parse(refStr) as S3Ref;
    if (partNumber !== ref.parts.length + 1) throw new Error(`expected part ${ref.parts.length + 1}, got ${partNumber}`);
    const res = await this.client.send(new UploadPartCommand({ Bucket: this.opts.bucket, Key: ref.key, UploadId: ref.uploadId, PartNumber: partNumber, Body: body }));
    ref.parts.push({ PartNumber: partNumber, ETag: res.ETag! });
    return JSON.stringify(ref);
  }

  async presignPartUrl(refStr: string, partNumber: number, ttlSeconds: number): Promise<string> {
    const ref = JSON.parse(refStr) as S3Ref;
    const cmd = new UploadPartCommand({ Bucket: this.opts.bucket, Key: ref.key, UploadId: ref.uploadId, PartNumber: partNumber });
    return getSignedUrl(this.client, cmd, { expiresIn: ttlSeconds });
  }

  async listParts(refStr: string): Promise<StoredPart[]> {
    const ref = JSON.parse(refStr) as S3Ref;
    const out: StoredPart[] = [];
    let marker: number | undefined;
    for (;;) {
      const res = await this.client.send(new ListPartsCommand({ Bucket: this.opts.bucket, Key: ref.key, UploadId: ref.uploadId, MaxParts: 1000, PartNumberMarker: marker !== undefined ? String(marker) : undefined }));
      for (const p of res.Parts ?? []) out.push({ partNumber: p.PartNumber!, size: p.Size ?? 0, etag: p.ETag ?? null });
      if (!res.IsTruncated) break;
      marker = Number(res.NextPartNumberMarker);
    }
    return out.sort((a, b) => a.partNumber - b.partNumber);
  }

  async completeResumable(refStr: string): Promise<{ size: number }> {
    const ref = JSON.parse(refStr) as S3Ref;
    const listed = await this.listParts(refStr);
    const parts = listed.length ? listed.map((p) => ({ PartNumber: p.partNumber, ETag: p.etag ?? undefined })) : ref.parts;
    await this.client.send(new CompleteMultipartUploadCommand({ Bucket: this.opts.bucket, Key: ref.key, UploadId: ref.uploadId, MultipartUpload: { Parts: parts } }));
    const head = await this.headObject(ref.key);
    return { size: head?.size ?? 0 };
  }

  async abortResumable(refStr: string): Promise<void> {
    const ref = JSON.parse(refStr) as S3Ref;
    await this.client.send(new AbortMultipartUploadCommand({ Bucket: this.opts.bucket, Key: ref.key, UploadId: ref.uploadId }));
  }

  async createDownloadUrl(key: string, opts: DownloadUrlOptions): Promise<string> {
    const safeName = opts.filename.replace(/["\r\n]/g, "_");
    const cmd = new GetObjectCommand({ Bucket: this.opts.bucket, Key: key, ResponseContentType: opts.contentType, ResponseContentDisposition: `${opts.disposition}; filename="${safeName}"` });
    return getSignedUrl(this.client, cmd, { expiresIn: opts.ttlSeconds });
  }

  async healthCheck(): Promise<{ ok: boolean; detail: string }> {
    try {
      await this.client.send(new HeadBucketCommand({ Bucket: this.opts.bucket }));
      return { ok: true, detail: `bucket reachable: ${this.opts.bucket}` };
    } catch (err) {
      return { ok: false, detail: String((err as Error).message ?? err) };
    }
  }
}
