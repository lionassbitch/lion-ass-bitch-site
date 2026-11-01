# THE WITNESS RECORD

*Your Memory. Your Statement. Your Signature.*

A private witness-affirmation platform for collecting individually authenticated,
firsthand statements about Edwin "Eddie" Colón's residence at 1665 Morris Avenue,
Bronx, New York. Every participant creates an independent, tamper-evident
evidentiary record: a signed written affirmation (New York CPLR Rule 2106 form),
an optional original video, optional supporting documents, authentication
provenance, an electronic-signature record, cryptographic hashes and a
hash-chained audit trail. Nothing is public. Nothing is pre-filled. Nothing is
edited after signing.

This is legal-evidence software, not a petition and not a marketing database.

## What is implemented and tested

| Area | Status | Verified by |
| --- | --- | --- |
| Sign in with Google / Microsoft (OpenID Connect, PKCE, state + nonce, server sessions) | Implemented | `tests/integration/*` run the real authorization-code flow against an in-process OIDC provider; real Google/Microsoft logins must be exercised once in your deployment (readiness page tracks this) |
| Privacy consent, witness profile, 11 neutral questions (EN/ES) | Implemented | integration + browser tests |
| In-browser video recording, file upload, resumable chunked uploads, retake | Implemented | browser test records with Chromium's camera and uploads; integration tests cover resume after interruption |
| Original-bytes preservation, SHA-256 at receipt, UTC receipt time, magic-byte type validation | Implemented | integration tests compare stored bytes and hashes |
| Review → explicit "Sign and Submit Affirmation" (drawn or typed signature) under CPLR § 2106 | Implemented | integration + browser tests; statute text pinned by `tests/unit/statute.test.ts` |
| Frozen signed record + canonical SHA-256, generated PDF + SHA-256, receipt | Implemented | PDF text and hashes asserted in tests |
| Immutability of signed statements, signatures, media and audit log (DB triggers) | Implemented | tests attempt direct SQL updates/deletes and expect failures |
| Corrections as new linked versions; originals preserved | Implemented | integration test |
| Per-statement evidence bundle (ZIP with manifest + audit summary), all-records ZIP, CSV/JSON metadata | Implemented | integration test parses the ZIPs and re-verifies every hash |
| Admin dashboard: allowlist identity, TOTP MFA, filters, search, PDF, video playback, annotations, audit, readiness | Implemented | integration + browser tests |
| Private invite links + QR + copyable invitation message | Implemented | integration + browser tests |
| Privacy/correction request handling | Implemented | integration test |
| Draft retention purge; signed records never auto-deleted | Implemented | integration test |
| Malware screening (ClamAV) | Implemented, **optional** | not exercised in tests; shows NOT CONFIGURED until `CLAMAV_HOST` is set |
| Video transcription | **Not implemented** (by design; originals are preserved without derivatives) | — |

The readiness checklist (`npm run readiness`, or Dashboard → Readiness) reports
READY / NOT CONFIGURED / NOT TESTED / FAILED for each dependency truthfully.

## Quick start (development)

```bash
cd witness-record
npm install
cp .env.example .env            # fill in at least SESSION_SECRET, APP_ENCRYPTION_KEY, DATABASE_URL, ADMIN_ALLOWLIST
npm run migrate                 # applies migrations/*.sql
npm run dev                     # server on :8080, Vite client on :5173 (proxying /api and /auth)
```

Without a PostgreSQL server you can develop against the embedded engine:
`DATABASE_URL=pglite://./data/pglite` (refused in production).

Sign-in requires real OAuth credentials even in development: there is no fake
login. See `docs/OAUTH.md`.

## Tests

```bash
npm test                        # unit + integration + browser (uses embedded PostgreSQL unless TEST_DATABASE_URL is set)
TEST_DATABASE_URL=postgres://user:pass@localhost:5432/postgres npm test   # against a real PostgreSQL server (recommended)
npm run typecheck
```

See `docs/TESTING.md` for what each suite proves and the manual checks that
cannot be automated (real provider logins, physical phones).

## Documentation

- `docs/SETUP.md` — configuration reference: database, storage, secrets, admin allowlist, limits, distribution
- `docs/OAUTH.md` — Google and Microsoft app registration, redirect URIs, scopes
- `docs/SECURITY.md` — threat model, controls, what is and is not claimed
- `docs/RETENTION.md` — retention policy, legal hold, privacy/correction request handling, deletion procedure
- `docs/SUPABASE.md` — the provisioned Supabase project (database + private bucket) and the values to paste into the host
- `docs/DEPLOYMENT.md` — domains, TLS, Docker, backups, secret management, publishing, record export
- `docs/TESTING.md` — automated suites and manual acceptance checklist

## Architecture

```
server/src
  app.ts              Fastify app: helmet CSP, rate limits, cookies, CSRF (Origin + custom header), session loading, SPA fallback
  config.ts           Validated environment (zod); production guards (https, secrets, no issuer overrides)
  auth/               OpenID Connect (openid-client), server-side sessions, admin allowlist, TOTP MFA
  db/                 Drizzle schema mirror, client (PostgreSQL / embedded pglite), SQL migration runner
  services/           statements (draft → review → sign/freeze), media (resumable uploads, hashing), pdf (pdfkit),
                      bundle (ZIP + manifest + audit summary), audit (hash chain), readiness, retention, scanner, filetype
  storage/            S3-compatible driver (multipart, presigned links, SSE) and local driver (signed links)
  statute/cplr2106.ts Verbatim CPLR Rule 2106 text and affirmation renderer
  i18n/               English and Spanish dictionaries (shared with the client and the PDF)
client/src            React 19 + react-router SPA: landing, protection notice, sign-in, invite, wizard, receipt, my statements, admin
migrations/           SQL source of truth (tables + append-only / immutability triggers)
tests/                unit, integration (API), e2e (Chromium, iPhone viewport, fake camera)
scripts/              readiness, check-oidc, export-records, purge-drafts, reset-admin-mfa, backup-db.sh
```

## Ownership and export

All evidence is stored in open formats: PostgreSQL rows, PDF, the witness's
original media files, PNG signature images, JSON manifests and plain-text audit
summaries. `npm run export:records -- ./exports` writes one ZIP per statement
plus an index without using the web UI. `scripts/backup-db.sh` produces a
`pg_dump` archive. Source, schema and records are all yours.

## Legal notes

The platform reproduces the CPLR Rule 2106 affirmation form as published by the
New York State Senate (retrieved 2026-10-30). It does not notarize documents,
does not verify government identity, and does not guarantee that any court will
accept an affirmation in every procedural context. Account sign-in establishes
which account was used, not who was physically present or whether the
statement is true.
