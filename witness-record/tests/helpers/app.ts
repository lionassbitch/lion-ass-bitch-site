import { OAuth2Server, Events } from "oauth2-mock-server";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import zlib from "node:zlib";
import crypto from "node:crypto";
import type { FastifyInstance } from "fastify";
import { createContext } from "../../server/src/index.js";
import { buildApp } from "../../server/src/app.js";
import type { AppContext } from "../../server/src/context.js";
import { createTestDatabase, type TestDatabase } from "./db.js";

export interface TestIdentity {
  sub: string;
  email: string;
  name: string;
  emailVerified?: boolean;
}

export interface TestApp {
  app: FastifyInstance;
  ctx: AppContext;
  oidc: OAuth2Server;
  baseUrl: string;
  storageDir: string;
  /** Runs the real OIDC authorization-code flow against the in-process provider and returns the session cookie. */
  login: (identity: TestIdentity, provider?: "google" | "microsoft") => Promise<string>;
  /** Sets the identity the in-process provider will assert on the next sign-in (for browser-driven logins). */
  setIdentity: (identity: TestIdentity) => void;
  /** Authenticated JSON request helper (adds CSRF headers and cookies). */
  api: (cookie: string | null, method: string, url: string, body?: unknown, extra?: Record<string, string>) => Promise<{ status: number; json: any; headers: Record<string, string | string[] | undefined>; raw: Buffer }>;
  close: () => Promise<void>;
}

export const TEST_SECRET = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

export async function startTestApp(overrides: Record<string, string> = {}, opts: { listen?: boolean } = {}): Promise<TestApp> {
  const oidc = new OAuth2Server();
  await oidc.issuer.keys.generate("RS256");
  await oidc.start(undefined, "localhost");
  const issuer = oidc.issuer.url!;
  let current: TestIdentity = { sub: "nobody", email: "nobody@example.test", name: "Nobody" };
  oidc.service.on(Events.BeforeTokenSigning, (token) => {
    Object.assign(token.payload, { sub: current.sub, email: current.email, email_verified: current.emailVerified ?? true, name: current.name });
  });

  const db: TestDatabase = await createTestDatabase();
  const storageDir = fs.mkdtempSync(path.join(os.tmpdir(), "wr-storage-"));
  const port = opts.listen ? await freePort() : 8080;
  const baseUrl = `http://localhost:${port}`;
  const ctx = await createContext({
    NODE_ENV: "test",
    BASE_URL: baseUrl,
    PORT: String(port),
    DATABASE_URL: db.url,
    SESSION_SECRET: TEST_SECRET,
    APP_ENCRYPTION_KEY: TEST_SECRET,
    STORAGE_DRIVER: "local",
    LOCAL_STORAGE_DIR: storageDir,
    GOOGLE_CLIENT_ID: "google-test-client",
    GOOGLE_CLIENT_SECRET: "google-test-secret",
    GOOGLE_ISSUER: issuer,
    MICROSOFT_CLIENT_ID: "microsoft-test-client",
    MICROSOFT_CLIENT_SECRET: "microsoft-test-secret",
    MICROSOFT_ISSUER: issuer,
    ADMIN_ALLOWLIST: "google:sub:admin-1,microsoft:email:owner@example.test",
    ADMIN_MFA_REQUIRED: "false",
    UPLOAD_CHUNK_BYTES: String(16 * 1024),
    LOG_LEVEL: "silent",
    ...overrides,
  });
  const app = await buildApp(ctx);
  if (opts.listen) await app.listen({ port, host: "127.0.0.1" });

  const api: TestApp["api"] = async (cookie, method, url, body, extra = {}) => {
    const res = await app.inject({
      method: method as "GET",
      url,
      payload: body === undefined ? undefined : Buffer.isBuffer(body) ? body : JSON.stringify(body),
      headers: {
        ...(body !== undefined ? { "content-type": Buffer.isBuffer(body) ? "application/octet-stream" : "application/json" } : {}),
        ...(cookie ? { cookie } : {}),
        origin: baseUrl,
        "x-requested-with": "XMLHttpRequest",
        ...extra,
      },
    });
    let json: unknown = null;
    try {
      json = res.json();
    } catch {
      json = null;
    }
    return { status: res.statusCode, json, headers: res.headers as Record<string, string | string[] | undefined>, raw: res.rawPayload };
  };

  const login: TestApp["login"] = async (identity, provider = "google") => {
    current = identity;
    const start = await app.inject({ method: "GET", url: `/auth/${provider}/start?returnTo=/statement` });
    if (start.statusCode !== 302) throw new Error(`start failed: ${start.statusCode} ${start.body}`);
    const oidcCookie = extractCookie(start.headers["set-cookie"], "wr_oidc");
    const authorize = await fetch(start.headers.location as string, { redirect: "manual" });
    const back = authorize.headers.get("location");
    if (!back) throw new Error("provider did not redirect back");
    const cbUrl = new URL(back);
    const cb = await app.inject({ method: "GET", url: cbUrl.pathname + cbUrl.search, headers: { cookie: `wr_oidc=${oidcCookie}` } });
    if (cb.statusCode !== 302 || !String(cb.headers.location).startsWith("/statement")) throw new Error(`callback failed: ${cb.statusCode} ${cb.headers.location} ${cb.body}`);
    const session = extractCookie(cb.headers["set-cookie"], "wr_session");
    return `wr_session=${session}`;
  };

  return {
    app,
    ctx,
    oidc,
    baseUrl,
    storageDir,
    login,
    setIdentity: (identity) => {
      current = identity;
    },
    api,
    close: async () => {
      await app.close();
      await ctx.dbHandle.close();
      await oidc.stop();
      await db.drop();
      fs.rmSync(storageDir, { recursive: true, force: true });
    },
  };
}

export function extractCookie(setCookie: string | string[] | undefined, name: string): string {
  const list = Array.isArray(setCookie) ? setCookie : setCookie ? [setCookie] : [];
  for (const c of list) {
    const m = c.match(new RegExp(`^${name}=([^;]*)`));
    if (m) return m[1];
  }
  throw new Error(`cookie ${name} not set`);
}

async function freePort(): Promise<number> {
  const net = await import("node:net");
  return new Promise((resolve) => {
    const srv = net.createServer();
    srv.listen(0, "127.0.0.1", () => {
      const port = (srv.address() as { port: number }).port;
      srv.close(() => resolve(port));
    });
  });
}

export function sha256(buf: Buffer | string): string {
  return crypto.createHash("sha256").update(buf).digest("hex");
}

/** A small valid PNG (solid dark rectangle) standing in for a drawn signature. */
export function tinyPng(width = 120, height = 40): Buffer {
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (width * 4 + 1)] = 0;
    for (let x = 0; x < width; x++) {
      const o = y * (width * 4 + 1) + 1 + x * 4;
      const ink = Math.abs(y - height / 2) < 3 || x % 20 < 2;
      raw[o] = ink ? 15 : 255;
      raw[o + 1] = ink ? 27 : 255;
      raw[o + 2] = ink ? 45 : 255;
      raw[o + 3] = ink ? 255 : 0;
    }
  }
  const chunk = (type: string, data: Buffer) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const td = Buffer.concat([Buffer.from(type), data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(td) >>> 0);
    return Buffer.concat([len, td, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk("IHDR", ihdr), chunk("IDAT", zlib.deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]);
}

function crc32(buf: Buffer): number {
  let c: number;
  const table: number[] = [];
  for (let n = 0; n < 256; n++) {
    c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  return crc ^ 0xffffffff;
}

/** Minimal ZIP reader (local file headers; stored or deflated entries) for asserting on exported bundles. */
export function readZip(buf: Buffer): Map<string, Buffer> {
  const out = new Map<string, Buffer>();
  // Walk the central directory for reliable sizes (archiver streams with data descriptors).
  const eocd = buf.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  if (eocd < 0) throw new Error("not a zip");
  const cdOffset = buf.readUInt32LE(eocd + 16);
  let p = cdOffset;
  while (p < eocd && buf.readUInt32LE(p) === 0x02014b50) {
    const method = buf.readUInt16LE(p + 10);
    const compSize = buf.readUInt32LE(p + 20);
    const nameLen = buf.readUInt16LE(p + 28);
    const extraLen = buf.readUInt16LE(p + 30);
    const commentLen = buf.readUInt16LE(p + 32);
    const localOffset = buf.readUInt32LE(p + 42);
    const name = buf.subarray(p + 46, p + 46 + nameLen).toString("utf8");
    const lNameLen = buf.readUInt16LE(localOffset + 26);
    const lExtraLen = buf.readUInt16LE(localOffset + 28);
    const dataStart = localOffset + 30 + lNameLen + lExtraLen;
    const data = buf.subarray(dataStart, dataStart + compSize);
    out.set(name, method === 8 ? zlib.inflateRawSync(data) : Buffer.from(data));
    p += 46 + nameLen + extraLen + commentLen;
  }
  return out;
}

export async function pdfText(pdf: Buffer): Promise<string> {
  const { PDFParse } = await import("pdf-parse");
  const parser = new PDFParse({ data: new Uint8Array(pdf) });
  const result = await parser.getText();
  await parser.destroy();
  // Collapse line wrapping so assertions can match sentences that span lines.
  return result.text.replace(/\s+/g, " ");
}

export const sampleProfile = {
  legalName: "María José Rivera-Santos",
  phone: "+1 718 555 0142",
  preferredContact: "phone",
  relationshipCategory: "neighbor",
  relationshipOther: null,
  relationshipDescription: "Next-door neighbor on the same floor.",
  howAndWhenMet: "We met in the hallway around the spring of 2019 when I moved in.",
  hasPersonalInterest: "no",
  personalInterestDescription: null,
  willingToBeContacted: "yes",
};

export const sampleAnswers = {
  q1_howKnow: "He is my neighbor. We live on the same floor and I saw him almost every day.",
  q2_personalKnowledge: "yes_personal_observation",
  q3_firstAware: { precision: "month_year", month: "2019-04", note: "around the time I moved in" },
  q4_mostRecentObservation: { precision: "approximate", date: "2025-12-20", note: "shortly before the holidays" },
  q5_observations: ["visited_at_address", "saw_enter_or_leave", "mail_or_deliveries"],
  q5_observationsOther: null,
  q6_circumstances: "I saw Eddie coming home most evenings. He kept his things in apartment 4B and I visited several times for coffee. The super knew him by name.",
  q7_frequency: "Several times a week.",
  q8_specificRecollections: "Thanksgiving 2023 we shared a meal at his apartment with his cousin.",
  q9_secondhandPortions: "My statement that he was on the lease comes from what the super told me; I did not see the lease myself.",
  q10_uncertainties: "I am not sure of the exact month he first moved in.",
  q11_hasMaterials: "yes",
  q11_materialsDescription: "A photo from Thanksgiving 2023 in his kitchen.",
};

export async function completeDraft(t: TestApp, cookie: string, language: "en" | "es" = "en") {
  const created = await t.api(cookie, "POST", "/api/statements", { language });
  if (created.status !== 201) throw new Error(`create failed ${created.status} ${JSON.stringify(created.json)}`);
  const id = created.json.statement.id as string;
  const cfg = await t.api(null, "GET", "/api/config");
  const consent = await t.api(cookie, "PUT", `/api/statements/${id}/consent`, { privacyNoticeVersion: cfg.json.privacyNoticeVersion, disclosureAcknowledged: true, voluntaryAcknowledged: true, withdrawalAcknowledged: true });
  if (consent.status !== 200) throw new Error(`consent failed ${consent.status} ${JSON.stringify(consent.json)}`);
  const profile = await t.api(cookie, "PUT", `/api/statements/${id}/profile`, sampleProfile);
  if (profile.status !== 200) throw new Error(`profile failed ${profile.status} ${JSON.stringify(profile.json)}`);
  const answers = await t.api(cookie, "PUT", `/api/statements/${id}/answers`, sampleAnswers);
  if (answers.status !== 200) throw new Error(`answers failed ${answers.status} ${JSON.stringify(answers.json)}`);
  return id;
}

export async function uploadFile(t: TestApp, cookie: string, statementId: string, file: Buffer, meta: { kind: "video" | "document"; sourceType: "live_capture" | "uploaded_file"; filename: string; mime: string; description?: string }) {
  const begin = await t.api(cookie, "POST", `/api/statements/${statementId}/uploads`, {
    kind: meta.kind,
    sourceType: meta.sourceType,
    filename: meta.filename,
    declaredMime: meta.mime,
    declaredBytes: file.length,
    description: meta.description ?? null,
    recordingConsent: meta.kind === "video" ? true : undefined,
  });
  if (begin.status !== 201) throw new Error(`begin failed ${begin.status} ${JSON.stringify(begin.json)}`);
  const { uploadId, chunkBytes } = begin.json;
  let offset = 0;
  while (offset < file.length) {
    const chunk = file.subarray(offset, Math.min(offset + chunkBytes, file.length));
    const r = await t.api(cookie, "PUT", `/api/uploads/${uploadId}/chunk?offset=${offset}`, chunk);
    if (r.status !== 200) throw new Error(`chunk failed ${r.status} ${JSON.stringify(r.json)}`);
    offset += chunk.length;
  }
  const done = await t.api(cookie, "POST", `/api/uploads/${uploadId}/complete`);
  if (done.status !== 200) throw new Error(`complete failed ${done.status} ${JSON.stringify(done.json)}`);
  return { uploadId, ...done.json } as { uploadId: string; mediaAssetId: string; sha256: string; sizeBytes: number; detectedMime: string; receivedAt: string; status: string };
}

export async function signStatement(t: TestApp, cookie: string, statementId: string, method: "drawn" | "typed" = "drawn") {
  const review = await t.api(cookie, "GET", `/api/statements/${statementId}/review`);
  if (review.status !== 200) throw new Error(`review failed ${review.status} ${JSON.stringify(review.json)}`);
  const legalName = review.json.statement.profile.legalName as string;
  const res = await t.api(cookie, "POST", `/api/statements/${statementId}/sign`, {
    legalName,
    method,
    typedValue: method === "typed" ? legalName : undefined,
    imageDataUrl: method === "drawn" ? `data:image/png;base64,${tinyPng().toString("base64")}` : undefined,
    declaredAccurate: true,
    consentedToEsign: true,
    reviewDigest: review.json.reviewDigest,
    affirmationTextSeen: review.json.affirmation.text,
  });
  return { review: review.json, res };
}
