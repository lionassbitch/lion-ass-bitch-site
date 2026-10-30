import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import type { Readable } from "node:stream";
import type { DownloadUrlOptions, StorageDriver } from "./types.js";
import { signPayload } from "../lib/crypto.js";

interface LocalRef {
  key: string;
  staging: string;
  contentType: string;
  nextPart: number;
}

/**
 * Filesystem driver. Intended for development, testing and single-server
 * deployments on an encrypted volume. Download links are HMAC-signed tokens
 * served by the application (/api/files/:token) and expire quickly.
 */
export class LocalStorageDriver implements StorageDriver {
  readonly kind = "local" as const;
  readonly description: string;
  readonly encryptionAtRest = "Relies on the host volume (enable full-disk or volume encryption).";
  private readonly root: string;
  private readonly staging: string;

  constructor(
    rootDir: string,
    private readonly secret: Buffer,
    private readonly baseUrl: URL,
  ) {
    this.root = path.resolve(rootDir);
    this.staging = path.join(this.root, ".staging");
    fs.mkdirSync(this.root, { recursive: true });
    fs.mkdirSync(this.staging, { recursive: true });
    this.description = `Local filesystem at ${this.root}`;
  }

  private resolve(key: string): string {
    if (key.includes("..") || path.isAbsolute(key)) throw new Error("invalid storage key");
    const full = path.join(this.root, key);
    if (!full.startsWith(this.root + path.sep)) throw new Error("invalid storage key");
    return full;
  }

  async putObject(key: string, body: Buffer, _contentType: string): Promise<{ size: number }> {
    const full = this.resolve(key);
    await fsp.mkdir(path.dirname(full), { recursive: true });
    const tmp = `${full}.${crypto.randomBytes(4).toString("hex")}.tmp`;
    await fsp.writeFile(tmp, body, { flag: "wx" });
    await fsp.rename(tmp, full);
    return { size: body.length };
  }

  async getObjectStream(key: string): Promise<Readable> {
    const full = this.resolve(key);
    await fsp.access(full);
    return fs.createReadStream(full);
  }

  async getObjectBuffer(key: string): Promise<Buffer> {
    return fsp.readFile(this.resolve(key));
  }

  async headObject(key: string): Promise<{ size: number } | null> {
    try {
      const st = await fsp.stat(this.resolve(key));
      return { size: st.size };
    } catch {
      return null;
    }
  }

  async deleteObject(key: string): Promise<void> {
    await fsp.rm(this.resolve(key), { force: true });
  }

  async beginResumable(key: string, contentType: string): Promise<string> {
    this.resolve(key);
    const staging = path.join(this.staging, crypto.randomUUID());
    await fsp.writeFile(staging, Buffer.alloc(0), { flag: "wx" });
    const ref: LocalRef = { key, staging, contentType, nextPart: 1 };
    return JSON.stringify(ref);
  }

  async appendPart(refStr: string, partNumber: number, body: Buffer): Promise<string> {
    const ref = JSON.parse(refStr) as LocalRef;
    if (partNumber !== ref.nextPart) throw new Error(`expected part ${ref.nextPart}, got ${partNumber}`);
    await fsp.appendFile(ref.staging, body);
    ref.nextPart += 1;
    return JSON.stringify(ref);
  }

  async completeResumable(refStr: string): Promise<{ size: number }> {
    const ref = JSON.parse(refStr) as LocalRef;
    const full = this.resolve(ref.key);
    await fsp.mkdir(path.dirname(full), { recursive: true });
    await fsp.rename(ref.staging, full);
    const st = await fsp.stat(full);
    return { size: st.size };
  }

  async abortResumable(refStr: string): Promise<void> {
    const ref = JSON.parse(refStr) as LocalRef;
    await fsp.rm(ref.staging, { force: true });
  }

  async createDownloadUrl(key: string, opts: DownloadUrlOptions): Promise<string> {
    const token = signPayload(
      this.secret,
      { key, fn: opts.filename, ct: opts.contentType, d: opts.disposition, n: crypto.randomBytes(8).toString("hex") },
      opts.ttlSeconds,
    );
    return new URL(`/api/files/${token}`, this.baseUrl).toString();
  }

  async healthCheck(): Promise<{ ok: boolean; detail: string }> {
    try {
      const probe = path.join(this.staging, `.probe-${crypto.randomUUID()}`);
      await fsp.writeFile(probe, "ok");
      await fsp.rm(probe);
      return { ok: true, detail: `writable: ${this.root}` };
    } catch (err) {
      return { ok: false, detail: String(err) };
    }
  }
}
