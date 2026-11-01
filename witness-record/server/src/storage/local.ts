import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import type { Readable } from "node:stream";
import type { DownloadUrlOptions, StorageDriver, StoredPart } from "./types.js";
import { signPayload, verifyPayload } from "../lib/crypto.js";

interface LocalRef {
  key: string;
  staging: string; // directory holding part-00001, part-00002, …
  contentType: string;
}

export interface LocalPartToken {
  staging: string;
  part: number;
}

/**
 * Filesystem driver. Intended for development, testing and single-server
 * deployments on an encrypted volume. Download links and direct-upload part
 * URLs are HMAC-signed tokens served by the application and expire quickly.
 */
export class LocalStorageDriver implements StorageDriver {
  readonly kind = "local" as const;
  readonly configured = true;
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

  private partPath(staging: string, n: number): string {
    return path.join(staging, `part-${String(n).padStart(5, "0")}`);
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

  async getObjectRange(key: string, start: number, end: number): Promise<Buffer> {
    const fh = await fsp.open(this.resolve(key), "r");
    try {
      const len = end - start + 1;
      const buf = Buffer.alloc(len);
      const { bytesRead } = await fh.read(buf, 0, len, start);
      return buf.subarray(0, bytesRead);
    } finally {
      await fh.close();
    }
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
    await fsp.mkdir(staging, { recursive: true });
    const ref: LocalRef = { key, staging, contentType };
    return JSON.stringify(ref);
  }

  async appendPart(refStr: string, partNumber: number, body: Buffer): Promise<string> {
    const ref = JSON.parse(refStr) as LocalRef;
    await this.writePart(ref.staging, partNumber, body);
    return refStr;
  }

  /** Used by the /api/files/part/:token route in direct mode. */
  async writePart(staging: string, partNumber: number, body: Buffer): Promise<void> {
    if (!staging.startsWith(this.staging + path.sep)) throw new Error("invalid staging path");
    const existing = await this.listPartsIn(staging);
    const expected = existing.length + 1;
    if (partNumber !== expected) throw new Error(`expected part ${expected}, got ${partNumber}`);
    await fsp.writeFile(this.partPath(staging, partNumber), body, { flag: "wx" });
  }

  async presignPartUrl(refStr: string, partNumber: number, ttlSeconds: number): Promise<string> {
    const ref = JSON.parse(refStr) as LocalRef;
    const token = signPayload(this.secret, { staging: ref.staging, part: partNumber } satisfies LocalPartToken, ttlSeconds);
    return new URL(`/api/files/part/${token}`, this.baseUrl).toString();
  }

  verifyPartToken(token: string): LocalPartToken | null {
    return verifyPayload<LocalPartToken & Record<string, unknown>>(this.secret, token);
  }

  private async listPartsIn(staging: string): Promise<StoredPart[]> {
    let names: string[];
    try {
      names = await fsp.readdir(staging);
    } catch {
      return [];
    }
    const parts: StoredPart[] = [];
    for (const n of names.filter((x) => x.startsWith("part-")).sort()) {
      const st = await fsp.stat(path.join(staging, n));
      parts.push({ partNumber: Number(n.slice(5)), size: st.size, etag: null });
    }
    return parts;
  }

  async listParts(refStr: string): Promise<StoredPart[]> {
    const ref = JSON.parse(refStr) as LocalRef;
    return this.listPartsIn(ref.staging);
  }

  async completeResumable(refStr: string): Promise<{ size: number }> {
    const ref = JSON.parse(refStr) as LocalRef;
    const full = this.resolve(ref.key);
    await fsp.mkdir(path.dirname(full), { recursive: true });
    const parts = await this.listPartsIn(ref.staging);
    const tmp = `${full}.${crypto.randomBytes(4).toString("hex")}.tmp`;
    const out = fs.createWriteStream(tmp, { flags: "wx" });
    for (const p of parts) {
      await new Promise<void>((resolve, reject) => {
        const rs = fs.createReadStream(this.partPath(ref.staging, p.partNumber));
        rs.on("error", reject);
        rs.on("end", resolve);
        rs.pipe(out, { end: false });
      });
    }
    await new Promise<void>((resolve, reject) => out.end((err?: Error | null) => (err ? reject(err) : resolve())));
    await fsp.rename(tmp, full);
    await fsp.rm(ref.staging, { recursive: true, force: true });
    const st = await fsp.stat(full);
    return { size: st.size };
  }

  async abortResumable(refStr: string): Promise<void> {
    const ref = JSON.parse(refStr) as LocalRef;
    await fsp.rm(ref.staging, { recursive: true, force: true });
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
