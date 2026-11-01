# Setup and configuration

All settings are environment variables (see `.env.example`). The server
validates them at start and refuses unsafe production configurations.

## Database

- `DATABASE_URL` — PostgreSQL 14+ connection string. Use TLS: `DATABASE_SSL=require`.
- Migrations live in `migrations/*.sql` and run automatically at server start
  (or `npm run migrate`). They create the tables **and the triggers** that make
  `audit_events`, `signatures`, `admin_annotations` append-only and freeze
  signed `witness_statements` and completed `media_assets`. Do not remove them.
- Development/test only: `DATABASE_URL=pglite://./data/pglite` runs embedded
  PostgreSQL (same SQL, same triggers). Refused when `NODE_ENV=production`.

## Storage

Original media, signature images and PDFs are stored in a private object store.

- `STORAGE_DRIVER=s3` (production): AWS S3, Cloudflare R2, Backblaze B2, MinIO…
  - `S3_BUCKET`, `S3_REGION`, `S3_ENDPOINT` (non-AWS), `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_FORCE_PATH_STYLE`
  - `S3_SSE=AES256` or `aws:kms` adds a server-side-encryption header to every upload. Also enforce default bucket encryption and block all public access at the bucket.
  - The bucket must be private. The app only ever hands out presigned GET links that expire after `DOWNLOAD_LINK_TTL_SECONDS` (default 300 s).
  - Uploads use native multipart uploads, so `UPLOAD_CHUNK_BYTES` must be ≥ 5 MiB (the default) on S3.
- `STORAGE_DRIVER=local`: files under `LOCAL_STORAGE_DIR`. Single-server use only; put it on an encrypted volume and back it up. Download links are HMAC-signed and expire the same way.

Storage keys are `statements/<statementId>/<kind>/<mediaId>` and are recorded
in the database and in every manifest.

## Secrets

- `SESSION_SECRET` — ≥32 random bytes (hex or base64). Signs OAuth state cookies and download links; rotating it logs everyone out.
- `APP_ENCRYPTION_KEY` — 32 random bytes (hex). Encrypts admin TOTP secrets at rest (AES-256-GCM).
- Generate: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
- Store secrets in your platform's secret manager (see `docs/DEPLOYMENT.md`), never in git.

## Sign-in providers

See `docs/OAUTH.md`. Without credentials the sign-in buttons are disabled and
the API returns `provider_not_configured`; there is no fallback login.

## Admin (case owner)

- `ADMIN_ALLOWLIST` — comma-separated, explicit. Preferred form binds the stable
  provider subject: `google:sub:1234567890`. Find your subject by signing in
  once as a witness and reading **Dashboard → Witness records → Account → Provider
  subject** (or the `users` table). Email form (`microsoft:email:you@example.org`)
  matches only when the provider marks the email verified; Microsoft personal
  accounts generally do not, so prefer `sub`.
- `ADMIN_MFA_REQUIRED=true` (default) — the dashboard requires a TOTP code from
  an authenticator app on every new session; enrollment happens on first visit.
  Re-enrollment after losing a device: `npm run admin:reset-mfa -- google sub:<id>`
  (requires server access by design).
- Admin sessions idle out after `ADMIN_SESSION_IDLE_MINUTES` (default 20).
- Admin status is re-evaluated against the allowlist on every request; removing
  an entry revokes access immediately.
- The dashboard UI is English-only; the witness experience is bilingual.

## Limits and uploads

`MAX_VIDEO_BYTES` (1 GiB), `MAX_DOCUMENT_BYTES` (25 MiB), `MAX_DOCUMENTS_PER_STATEMENT` (10), `UPLOAD_CHUNK_BYTES` (5 MiB).
Accepted types are determined from magic bytes, not from the filename:
video `mp4, webm, mov, mkv, 3gp`; documents `pdf, png, jpeg, heic/heif, webp, gif, plain text`.

## Sessions and cookies

Cookies are `HttpOnly`, `SameSite=Lax`, `Secure` when `BASE_URL` is https.
`SESSION_TTL_HOURS` absolute lifetime; `SESSION_IDLE_MINUTES` idle timeout.
State-changing API calls must carry `X-Requested-With: XMLHttpRequest` and an
`Origin` equal to `BASE_URL` (CSRF defence).

## Distribution

- `REQUIRE_INVITE_LINK=true` (default): witnesses must arrive through a private
  link created in **Dashboard → Private links** (`https://<host>/i/<token>`).
  Each link has a label, an opens counter, a downloadable QR code and can be
  revoked. Links never expose evidence; they only unlock the statement flow.
- The dashboard provides an English and Spanish invitation message to copy and
  send **individually**. The platform sends no email or SMS of its own.

## Case metadata

`CASE_SUBJECT_NAME`, `CASE_ADDRESS` appear in PDFs and manifests;
`CASE_OWNER_CONTACT_EMAIL` is informational.

## Technical metadata

`COLLECT_IP_ADDRESS` and `COLLECT_USER_AGENT` (default true) control whether
client IP and browser type are recorded on sessions, uploads, signatures and
audit entries. The privacy notice, the protection page and the readiness
checklist disclose the current setting. Set `TRUST_PROXY=true` only behind a
reverse proxy you control, so IPs come from `X-Forwarded-For`.

## Retention

`DRAFT_RETENTION_DAYS` (90), `RETENTION_JOB_ENABLED` (daily in-process purge; or
run `npx tsx scripts/purge-drafts.ts` from cron), `LEGAL_HOLD_UNTIL` (informational
minimum retention date shown on the checklist). Signed statements are never
auto-deleted. See `docs/RETENTION.md`.
