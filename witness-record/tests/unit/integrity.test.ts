import { describe, it, expect } from "vitest";
import { canonicalJson } from "../../server/src/lib/canonical.js";
import { sha256Hex, signPayload, verifyPayload, encryptSecret, decryptSecret, hashToken, randomToken } from "../../server/src/lib/crypto.js";
import { computeEntryHash, GENESIS_HASH } from "../../server/src/services/audit.js";
import { newEvidenceId } from "../../server/src/lib/ids.js";
import { matchesAdminAllowlist } from "../../server/src/auth/admin.js";
import { parseAdminAllowlist, loadConfig } from "../../server/src/config.js";
import { detectMime, isAllowedFor } from "../../server/src/services/filetype.js";
import { answersSchema, profileSchema, signInputSchema } from "../../server/src/validation.js";

describe("canonical JSON and digests", () => {
  it("is independent of key order and undefined fields", () => {
    const a = canonicalJson({ b: 1, a: { d: [3, { z: 1, y: 2 }], c: "x" }, u: undefined });
    const b = canonicalJson({ a: { c: "x", d: [3, { y: 2, z: 1 }] }, b: 1 });
    expect(a).toBe(b);
    expect(sha256Hex(a)).toBe(sha256Hex(b));
  });
  it("changes when any value changes", () => {
    expect(sha256Hex(canonicalJson({ a: "x" }))).not.toBe(sha256Hex(canonicalJson({ a: "x " })));
  });
});

describe("audit hash chain", () => {
  const entry = { occurredAt: "2026-10-30T00:00:00.000Z", actorType: "witness" as const, action: "x", detail: { k: 1 } };
  it("links each entry to the previous hash", () => {
    const h1 = computeEntryHash(GENESIS_HASH, entry);
    const h2 = computeEntryHash(h1, { ...entry, action: "y" });
    expect(h1).not.toBe(h2);
    expect(computeEntryHash("f".repeat(64), entry)).not.toBe(h1);
    expect(computeEntryHash(GENESIS_HASH, { ...entry, detail: { k: 2 } })).not.toBe(h1);
  });
});

describe("tokens and secrets", () => {
  const secret = Buffer.alloc(32, 7);
  it("signed payloads verify, expire and reject tampering", () => {
    const tok = signPayload(secret, { key: "a/b" }, 60);
    expect(verifyPayload<{ key: string }>(secret, tok)?.key).toBe("a/b");
    expect(verifyPayload(secret, tok.slice(0, -2) + "zz")).toBeNull();
    expect(verifyPayload(Buffer.alloc(32, 8), tok)).toBeNull();
    const expired = signPayload(secret, { key: "x" }, -1);
    expect(verifyPayload(secret, expired)).toBeNull();
  });
  it("encrypts and decrypts with AES-256-GCM, rejecting modified ciphertext", () => {
    const blob = encryptSecret(secret, "JBSWY3DPEHPK3PXP");
    expect(decryptSecret(secret, blob)).toBe("JBSWY3DPEHPK3PXP");
    const parts = blob.split(".");
    // Flip a character in the middle of the ciphertext so the decoded bytes certainly change.
    const mid = Math.floor(parts[2].length / 2);
    parts[2] = parts[2].slice(0, mid) + (parts[2][mid] === "A" ? "B" : "A") + parts[2].slice(mid + 1);
    expect(() => decryptSecret(secret, parts.join("."))).toThrow();
  });
  it("session tokens are random and stored only as hashes", () => {
    const a = randomToken();
    const b = randomToken();
    expect(a).not.toBe(b);
    expect(hashToken(a)).toMatch(/^[0-9a-f]{64}$/);
  });
  it("evidence IDs are well-formed and unambiguous", () => {
    const id = newEvidenceId(new Date("2026-01-01T00:00:00Z"));
    expect(id).toMatch(/^WR-2026-[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{8}$/);
  });
});

describe("admin allowlist", () => {
  it("parses entries and rejects malformed ones", () => {
    expect(parseAdminAllowlist(" google:sub:123 , microsoft:email:Owner@Example.org ")).toEqual([
      { provider: "google", kind: "sub", value: "123" },
      { provider: "microsoft", kind: "email", value: "owner@example.org" },
    ]);
    expect(() => parseAdminAllowlist("facebook:sub:1")).toThrow();
    expect(() => parseAdminAllowlist("google:name:eddie")).toThrow();
  });
  it("matches by subject, or by verified email only", () => {
    const list = parseAdminAllowlist("google:sub:123,microsoft:email:owner@example.org");
    expect(matchesAdminAllowlist(list, { provider: "google", providerSubject: "123", email: null, emailVerified: false })).toBeTruthy();
    expect(matchesAdminAllowlist(list, { provider: "microsoft", providerSubject: "123", email: null, emailVerified: false })).toBeNull();
    expect(matchesAdminAllowlist(list, { provider: "microsoft", providerSubject: "9", email: "owner@example.org", emailVerified: true })).toBeTruthy();
    expect(matchesAdminAllowlist(list, { provider: "microsoft", providerSubject: "9", email: "owner@example.org", emailVerified: false })).toBeNull();
    expect(matchesAdminAllowlist(list, { provider: "google", providerSubject: "9", email: "owner@example.org", emailVerified: true })).toBeNull();
  });
});

describe("configuration guards", () => {
  const base = { NODE_ENV: "production", BASE_URL: "https://witness.example.org", SESSION_SECRET: "a".repeat(64), APP_ENCRYPTION_KEY: "b".repeat(64), DATABASE_URL: "postgres://x", STORAGE_DRIVER: "s3", S3_BUCKET: "b", S3_ACCESS_KEY_ID: "k", S3_SECRET_ACCESS_KEY: "s", ADMIN_ALLOWLIST: "google:sub:1" };
  it("refuses production without a session secret or https", () => {
    expect(() => loadConfig({ ...base, SESSION_SECRET: "" })).toThrow(/SESSION_SECRET/);
    expect(() => loadConfig({ ...base, BASE_URL: "http://witness.example.org" })).toThrow(/https/);
  });
  it("never allows issuer overrides outside tests (no fake login path)", () => {
    expect(() => loadConfig({ ...base, GOOGLE_ISSUER: "http://localhost:9999" })).toThrow(/NODE_ENV=test/);
    expect(() => loadConfig({ ...base, MICROSOFT_ISSUER: "http://localhost:9999" })).toThrow(/NODE_ENV=test/);
  });
  it("reports providers as unconfigured when secrets are missing", () => {
    const cfg = loadConfig(base);
    expect(cfg.providers.google.configured).toBe(false);
    expect(cfg.providers.microsoft.issuer).toBe("https://login.microsoftonline.com/common/v2.0");
    expect(loadConfig({ ...base, MICROSOFT_TENANT: "consumers" }).providers.microsoft.issuer).toBe("https://login.microsoftonline.com/consumers/v2.0");
  });
});

describe("file type detection", () => {
  it("accepts real media and rejects disguised executables", async () => {
    const pdf = Buffer.from("%PDF-1.7\n%âãÏÓ\n1 0 obj\n");
    expect(await detectMime(pdf)).toBe("application/pdf");
    expect(isAllowedFor("document", "application/pdf")).toBe(true);
    expect(isAllowedFor("video", "application/pdf")).toBe(false);
    const exe = Buffer.concat([Buffer.from("MZ"), Buffer.alloc(200)]);
    const m = await detectMime(exe);
    expect(isAllowedFor("document", m)).toBe(false);
    expect(isAllowedFor("video", m)).toBe(false);
    expect(await detectMime(Buffer.from("plain text note"))).toBe("text/plain");
  });
});

describe("statement validation", () => {
  it("requires explicit intent for signing", () => {
    const ok = { legalName: "A B", method: "typed", typedValue: "A B", declaredAccurate: true, consentedToEsign: true, reviewDigest: "a".repeat(64), affirmationTextSeen: "x".repeat(60) };
    expect(signInputSchema.safeParse(ok).success).toBe(true);
    expect(signInputSchema.safeParse({ ...ok, declaredAccurate: false }).success).toBe(false);
    expect(signInputSchema.safeParse({ ...ok, consentedToEsign: "yes" }).success).toBe(false);
  });
  it("never pre-supposes an answer: empty answers fail, honest uncertainty passes", () => {
    expect(answersSchema.safeParse({}).success).toBe(false);
    const honest = {
      q1_howKnow: "Neighbor.",
      q2_personalKnowledge: "uncertain",
      q3_firstAware: { precision: "unknown" },
      q4_mostRecentObservation: { precision: "unknown" },
      q5_observations: ["none"],
      q6_circumstances: "I am not sure.",
      q7_frequency: "",
      q8_specificRecollections: "",
      q9_secondhandPortions: "",
      q10_uncertainties: "Everything.",
      q11_hasMaterials: "no",
    };
    expect(answersSchema.safeParse(honest).success).toBe(true);
    expect(answersSchema.safeParse({ ...honest, q3_firstAware: { precision: "range", rangeStart: "2024-05", rangeEnd: "2023-01" } }).success).toBe(false);
    expect(profileSchema.safeParse({ legalName: "x", preferredContact: "email", relationshipCategory: "friend", relationshipDescription: "y", howAndWhenMet: "z", hasPersonalInterest: "no", willingToBeContacted: "yes" }).success).toBe(true);
  });
});
