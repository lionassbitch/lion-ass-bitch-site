import { z } from "zod";
import crypto from "node:crypto";

/**
 * Central, validated configuration. Nothing in the application reads
 * process.env directly except this module, so every setting is documented
 * in .env.example and surfaced truthfully on the readiness checklist.
 */

const bool = z
  .union([z.boolean(), z.string()])
  .transform((v) => (typeof v === "boolean" ? v : ["1", "true", "yes", "on"].includes(v.toLowerCase())));

const intFromEnv = (def: number) =>
  z
    .union([z.number(), z.string()])
    .optional()
    .transform((v) => (v === undefined || v === "" ? def : Number(v)))
    .pipe(z.number().int().nonnegative());

const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  BASE_URL: z.string().url().default("http://localhost:8080"),
  PORT: intFromEnv(8080),
  HOST: z.string().default("0.0.0.0"),

  DATABASE_URL: z.string().default(""),
  DATABASE_SSL: z.string().default(""),

  SESSION_SECRET: z.string().default(""),
  APP_ENCRYPTION_KEY: z.string().default(""),

  GOOGLE_CLIENT_ID: z.string().default(""),
  GOOGLE_CLIENT_SECRET: z.string().default(""),
  // Test-only override for the issuer (never honoured outside NODE_ENV=test).
  GOOGLE_ISSUER: z.string().default("https://accounts.google.com"),

  MICROSOFT_CLIENT_ID: z.string().default(""),
  MICROSOFT_CLIENT_SECRET: z.string().default(""),
  MICROSOFT_TENANT: z.string().default("common"),
  MICROSOFT_ISSUER: z.string().default(""),

  ADMIN_ALLOWLIST: z.string().default(""),
  ADMIN_MFA_REQUIRED: bool.default(true),
  REQUIRE_INVITE_LINK: bool.default(true),
  BACKUP_LAST_VERIFIED: z.string().default(""),

  STORAGE_DRIVER: z.enum(["s3", "local"]).default("local"),
  S3_BUCKET: z.string().default(""),
  S3_REGION: z.string().default("us-east-1"),
  S3_ENDPOINT: z.string().default(""),
  S3_ACCESS_KEY_ID: z.string().default(""),
  S3_SECRET_ACCESS_KEY: z.string().default(""),
  S3_FORCE_PATH_STYLE: bool.default(false),
  S3_SSE: z.string().default("AES256"),
  LOCAL_STORAGE_DIR: z.string().default("./data/storage"),

  CLAMAV_HOST: z.string().default(""),
  CLAMAV_PORT: intFromEnv(3310),

  MAX_VIDEO_BYTES: intFromEnv(1024 * 1024 * 1024),
  MAX_DOCUMENT_BYTES: intFromEnv(25 * 1024 * 1024),
  MAX_DOCUMENTS_PER_STATEMENT: intFromEnv(10),
  UPLOAD_CHUNK_BYTES: intFromEnv(5 * 1024 * 1024),

  SESSION_TTL_HOURS: intFromEnv(12),
  SESSION_IDLE_MINUTES: intFromEnv(60),
  ADMIN_SESSION_IDLE_MINUTES: intFromEnv(20),
  DOWNLOAD_LINK_TTL_SECONDS: intFromEnv(300),

  DRAFT_RETENTION_DAYS: intFromEnv(90),
  RETENTION_JOB_ENABLED: bool.default(true),
  LEGAL_HOLD_UNTIL: z.string().default(""),

  CASE_SUBJECT_NAME: z.string().default('Edwin "Eddie" Colón'),
  CASE_ADDRESS: z.string().default("1665 Morris Avenue, Bronx, New York"),
  CASE_OWNER_CONTACT_EMAIL: z.string().default(""),

  COLLECT_IP_ADDRESS: bool.default(true),
  COLLECT_USER_AGENT: bool.default(true),
  TRUST_PROXY: bool.default(false),
  LOG_LEVEL: z.string().default("info"),
});

export type Env = z.infer<typeof EnvSchema>;

export interface ProviderConfig {
  key: "google" | "microsoft";
  label: string;
  issuer: string;
  clientId: string;
  clientSecret: string;
  scopes: string;
  configured: boolean;
}

export interface AppConfig {
  env: Env;
  isProd: boolean;
  isTest: boolean;
  baseUrl: URL;
  sessionSecret: Buffer;
  encryptionKey: Buffer | null;
  providers: Record<"google" | "microsoft", ProviderConfig>;
  adminAllowlist: AdminAllowEntry[];
  storageConfigured: boolean;
  warnings: string[];
}

export interface AdminAllowEntry {
  provider: "google" | "microsoft";
  kind: "sub" | "email";
  value: string;
}

export function parseAdminAllowlist(raw: string): AdminAllowEntry[] {
  const out: AdminAllowEntry[] = [];
  for (const piece of raw.split(",")) {
    const entry = piece.trim();
    if (!entry) continue;
    const [provider, kind, ...rest] = entry.split(":");
    const value = rest.join(":").trim();
    if ((provider !== "google" && provider !== "microsoft") || (kind !== "sub" && kind !== "email") || !value) {
      throw new Error(`Invalid ADMIN_ALLOWLIST entry "${entry}". Expected provider:sub:<id> or provider:email:<address>.`);
    }
    out.push({ provider, kind, value: kind === "email" ? value.toLowerCase() : value });
  }
  return out;
}

function decodeKey(raw: string, name: string, minBytes: number, required: boolean): Buffer | null {
  if (!raw) {
    if (required) throw new Error(`${name} is required. Generate one with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`);
    return null;
  }
  let buf: Buffer;
  if (/^[0-9a-fA-F]+$/.test(raw) && raw.length % 2 === 0) buf = Buffer.from(raw, "hex");
  else buf = Buffer.from(raw, "base64");
  if (buf.length < minBytes) throw new Error(`${name} must decode to at least ${minBytes} bytes.`);
  return buf;
}

export function loadConfig(source: NodeJS.ProcessEnv = process.env): AppConfig {
  const parsed = EnvSchema.safeParse(source);
  if (!parsed.success) {
    throw new Error(`Invalid environment configuration: ${parsed.error.message}`);
  }
  const env = parsed.data;
  const isProd = env.NODE_ENV === "production";
  const isTest = env.NODE_ENV === "test";
  const warnings: string[] = [];

  let sessionSecret: Buffer;
  if (env.SESSION_SECRET) {
    sessionSecret = decodeKey(env.SESSION_SECRET, "SESSION_SECRET", 32, true)!;
  } else if (isProd) {
    throw new Error("SESSION_SECRET is required in production.");
  } else {
    // Development/test convenience only: an ephemeral secret means sessions do
    // not survive a restart. Never used in production (see guard above).
    sessionSecret = crypto.randomBytes(32);
    warnings.push("SESSION_SECRET not set; using an ephemeral secret (development only).");
  }

  const encryptionKey = decodeKey(env.APP_ENCRYPTION_KEY, "APP_ENCRYPTION_KEY", 32, isProd && env.ADMIN_MFA_REQUIRED);
  if (!encryptionKey) warnings.push("APP_ENCRYPTION_KEY not set; admin MFA enrollment is unavailable.");

  if (!isTest && env.GOOGLE_ISSUER !== "https://accounts.google.com") {
    throw new Error("GOOGLE_ISSUER may only be overridden when NODE_ENV=test.");
  }
  const defaultMsIssuer = `https://login.microsoftonline.com/${env.MICROSOFT_TENANT}/v2.0`;
  if (!isTest && env.MICROSOFT_ISSUER && env.MICROSOFT_ISSUER !== defaultMsIssuer) {
    throw new Error("MICROSOFT_ISSUER may only be overridden when NODE_ENV=test.");
  }

  const providers: AppConfig["providers"] = {
    google: {
      key: "google",
      label: "Google",
      issuer: env.GOOGLE_ISSUER,
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
      scopes: "openid email profile",
      configured: Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET),
    },
    microsoft: {
      key: "microsoft",
      label: "Microsoft",
      issuer: env.MICROSOFT_ISSUER || defaultMsIssuer,
      clientId: env.MICROSOFT_CLIENT_ID,
      clientSecret: env.MICROSOFT_CLIENT_SECRET,
      scopes: "openid email profile",
      configured: Boolean(env.MICROSOFT_CLIENT_ID && env.MICROSOFT_CLIENT_SECRET),
    },
  };

  const adminAllowlist = parseAdminAllowlist(env.ADMIN_ALLOWLIST);
  if (adminAllowlist.length === 0) warnings.push("ADMIN_ALLOWLIST is empty; no account can open the admin dashboard.");

  const storageConfigured =
    env.STORAGE_DRIVER === "local" ? true : Boolean(env.S3_BUCKET && env.S3_ACCESS_KEY_ID && env.S3_SECRET_ACCESS_KEY);
  if (isProd && env.STORAGE_DRIVER === "local") warnings.push("STORAGE_DRIVER=local in production: files live on the server disk; ensure disk encryption and backups.");
  if (!storageConfigured) warnings.push("S3 storage is not fully configured.");

  if (isProd && !new URL(env.BASE_URL).protocol.startsWith("https")) {
    throw new Error("BASE_URL must use https in production.");
  }

  return {
    env,
    isProd,
    isTest,
    baseUrl: new URL(env.BASE_URL),
    sessionSecret,
    encryptionKey,
    providers,
    adminAllowlist,
    storageConfigured,
    warnings,
  };
}
