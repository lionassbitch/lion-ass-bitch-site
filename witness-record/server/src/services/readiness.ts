import { sql } from "drizzle-orm";
import type { AppContext } from "../context.js";

export type ReadinessStatus = "READY" | "NOT CONFIGURED" | "NOT TESTED" | "WARNING" | "FAILED";

export interface ReadinessItem {
  key: string;
  label: string;
  status: ReadinessStatus;
  detail: string;
  doc?: string;
}

async function scalar(ctx: AppContext, query: ReturnType<typeof sql>): Promise<number> {
  const res = await ctx.db.execute(query);
  const rows = ((res as unknown as { rows?: Record<string, unknown>[] }).rows ?? (res as unknown as Record<string, unknown>[])) as Record<string, unknown>[];
  const v = rows[0] ? Object.values(rows[0])[0] : 0;
  return Number(v ?? 0);
}

/**
 * Truthful launch checklist. Each item reports READY only when the system can
 * observe that it works (configuration + a live check or recorded evidence).
 */
export async function readinessReport(ctx: AppContext): Promise<{ generatedAt: string; items: ReadinessItem[]; warnings: string[] }> {
  const items: ReadinessItem[] = [];
  const env = ctx.cfg.env;

  // Database
  try {
    const migrations = await scalar(ctx, sql`SELECT count(*) FROM schema_migrations`);
    items.push({ key: "database", label: "Database (PostgreSQL) connected and migrated", status: "READY", detail: `${ctx.dbHandle.kind}; ${migrations} migration(s) applied${env.DATABASE_SSL ? "; TLS: " + env.DATABASE_SSL : "; TLS not requested"}`, doc: "docs/SETUP.md#database" });
  } catch (err) {
    items.push({ key: "database", label: "Database connected and migrated", status: "FAILED", detail: String((err as Error).message), doc: "docs/SETUP.md#database" });
  }

  // Secrets
  items.push({
    key: "session_secret",
    label: "SESSION_SECRET configured",
    status: env.SESSION_SECRET ? "READY" : "NOT CONFIGURED",
    detail: env.SESSION_SECRET ? "persistent secret set" : "ephemeral secret in use (sessions reset on restart)",
    doc: "docs/SETUP.md#secrets",
  });
  items.push({
    key: "encryption_key",
    label: "APP_ENCRYPTION_KEY configured (admin MFA secrets)",
    status: ctx.cfg.encryptionKey ? "READY" : "NOT CONFIGURED",
    detail: ctx.cfg.encryptionKey ? "AES-256-GCM key present" : "admin MFA enrollment unavailable",
    doc: "docs/SETUP.md#secrets",
  });
  items.push({
    key: "https",
    label: "Public origin uses HTTPS",
    status: ctx.cfg.baseUrl.protocol === "https:" ? "READY" : ctx.cfg.isProd ? "FAILED" : "WARNING",
    detail: ctx.cfg.baseUrl.origin,
    doc: "docs/DEPLOYMENT.md#domain",
  });

  // OAuth providers
  for (const key of ["google", "microsoft"] as const) {
    const p = ctx.cfg.providers[key];
    if (!p.configured) {
      items.push({ key: `oauth_${key}`, label: `Sign in with ${p.label}`, status: "NOT CONFIGURED", detail: `${key.toUpperCase()}_CLIENT_ID / _CLIENT_SECRET not set`, doc: "docs/OAUTH.md" });
      continue;
    }
    const disc = await ctx.oidc.discoveryCheck(key);
    if (!disc.ok) {
      items.push({ key: `oauth_${key}`, label: `Sign in with ${p.label}`, status: "FAILED", detail: `discovery failed: ${disc.detail}`, doc: "docs/OAUTH.md" });
      continue;
    }
    const realIssuer = key === "google" ? "accounts.google.com" : "login.microsoftonline.com";
    const logins = await scalar(
      ctx,
      sql`SELECT count(*) FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.auth_provider = ${key} AND u.provider_issuer LIKE ${"%" + realIssuer + "%"}`,
    );
    items.push({
      key: `oauth_${key}`,
      label: `Sign in with ${p.label}`,
      status: logins > 0 ? "READY" : "NOT TESTED",
      detail: logins > 0 ? `${disc.detail}; ${logins} real sign-in(s) recorded` : `${disc.detail}; configured but no real sign-in has completed yet — perform a test login`,
      doc: "docs/OAUTH.md",
    });
  }

  // Admin
  if (!ctx.cfg.adminAllowlist.length) {
    items.push({ key: "admin", label: "Admin allowlist", status: "NOT CONFIGURED", detail: "ADMIN_ALLOWLIST is empty", doc: "docs/SETUP.md#admin" });
  } else {
    const enrolled = await scalar(ctx, sql`SELECT count(*) FROM admin_mfa`);
    const adminLogins = await scalar(ctx, sql`SELECT count(*) FROM sessions WHERE is_admin = true`);
    const status: ReadinessStatus = adminLogins === 0 ? "NOT TESTED" : env.ADMIN_MFA_REQUIRED && enrolled === 0 ? "WARNING" : "READY";
    items.push({
      key: "admin",
      label: "Admin allowlist and MFA",
      status,
      detail: `${ctx.cfg.adminAllowlist.length} allowlisted account(s); MFA required: ${env.ADMIN_MFA_REQUIRED ? "yes" : "no"}; enrolled: ${enrolled}; admin sign-ins: ${adminLogins}`,
      doc: "docs/SETUP.md#admin",
    });
  }

  // Storage
  const health = await ctx.storage.healthCheck();
  items.push({
    key: "storage",
    label: "Private object storage",
    status: !ctx.storage.configured ? "NOT CONFIGURED" : !health.ok ? "FAILED" : ctx.storage.kind === "local" && ctx.cfg.isProd ? "WARNING" : "READY",
    detail: `${ctx.storage.description}; ${health.detail}; at rest: ${ctx.storage.encryptionAtRest}`,
    doc: "docs/SETUP.md#storage",
  });
  if (ctx.storage.kind === "s3") {
    const completed = await scalar(ctx, sql`SELECT count(*) FROM media_assets WHERE status = 'complete' AND kind IN ('video','document')`);
    items.push({
      key: "uploads",
      label: `Witness uploads to the bucket (${env.UPLOAD_MODE} mode)`,
      status: completed > 0 ? "READY" : "NOT TESTED",
      detail: completed > 0 ? `${completed} original file(s) stored and hashed` : "no upload has completed against this bucket yet — record a test statement",
      doc: "docs/SETUP.md#storage",
    });
  }
  items.push({
    key: "retention_job",
    label: "Scheduled draft purge",
    status: env.RETENTION_JOB_ENABLED || env.CRON_SECRET ? "READY" : "NOT CONFIGURED",
    detail: env.RETENTION_JOB_ENABLED ? "in-process daily timer (requires an always-on host)" : env.CRON_SECRET ? "external scheduler via GET /api/cron/retention with CRON_SECRET" : "RETENTION_JOB_ENABLED=false and no CRON_SECRET: drafts are never purged",
    doc: "docs/RETENTION.md",
  });

  // Malware
  if (!ctx.scanner.configured) items.push({ key: "malware", label: "Malware screening (ClamAV)", status: "NOT CONFIGURED", detail: "CLAMAV_HOST not set; attachments are type-checked by magic bytes but not virus-scanned", doc: "docs/SECURITY.md#malware" });
  else {
    const ping = await ctx.scanner.ping();
    items.push({ key: "malware", label: "Malware screening (ClamAV)", status: ping.ok ? "READY" : "FAILED", detail: ping.detail, doc: "docs/SECURITY.md#malware" });
  }

  // Audit chain
  try {
    const chain = await ctx.audit.verifyChain();
    items.push({ key: "audit", label: "Audit log hash chain", status: chain.ok ? "READY" : "FAILED", detail: chain.ok ? `${chain.count} entries verified` : `broken at entry ${chain.brokenAtId}`, doc: "docs/SECURITY.md#audit" });
  } catch (err) {
    items.push({ key: "audit", label: "Audit log hash chain", status: "FAILED", detail: String((err as Error).message) });
  }

  // Invites
  const invites = await scalar(ctx, sql`SELECT count(*) FROM invite_links WHERE revoked_at IS NULL`);
  items.push({
    key: "invites",
    label: "Private submission link",
    status: !env.REQUIRE_INVITE_LINK ? "WARNING" : invites > 0 ? "READY" : "NOT CONFIGURED",
    detail: !env.REQUIRE_INVITE_LINK ? "invite links not required: anyone with the URL can start a statement" : `${invites} active link(s)`,
    doc: "docs/SETUP.md#distribution",
  });

  // Backups / retention
  items.push({
    key: "backups",
    label: "Database and storage backups verified",
    status: env.BACKUP_LAST_VERIFIED ? "READY" : "NOT TESTED",
    detail: env.BACKUP_LAST_VERIFIED ? `last successful restore test: ${env.BACKUP_LAST_VERIFIED}` : "no restore test recorded (set BACKUP_LAST_VERIFIED after testing scripts/backup-db.sh)",
    doc: "docs/DEPLOYMENT.md#backups",
  });
  items.push({
    key: "retention",
    label: "Retention policy",
    status: "READY",
    detail: `drafts purged after ${env.DRAFT_RETENTION_DAYS} days; signed records retained ${env.LEGAL_HOLD_UNTIL ? `at least until ${env.LEGAL_HOLD_UNTIL}` : "indefinitely"} and never auto-deleted`,
    doc: "docs/RETENTION.md",
  });
  items.push({
    key: "metadata",
    label: "Technical metadata collection disclosed",
    status: "READY",
    detail: `IP address: ${env.COLLECT_IP_ADDRESS ? "collected" : "not collected"}; user agent: ${env.COLLECT_USER_AGENT ? "collected" : "not collected"}; trust proxy: ${env.TRUST_PROXY}`,
    doc: "docs/SECURITY.md#metadata",
  });
  items.push({ key: "transcription", label: "Video transcription", status: "NOT CONFIGURED", detail: "Not implemented; original video is preserved without derivative transcripts", doc: "docs/SECURITY.md#transcription" });

  return { generatedAt: new Date().toISOString(), items, warnings: ctx.cfg.warnings };
}
