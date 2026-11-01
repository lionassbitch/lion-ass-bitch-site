# Testing

## Automated suites

```bash
npm test                     # everything
npm run test:unit            # statute text, canonical JSON, hashing, tokens, allowlist, config guards, file types, validation
npm run test:integration     # full API workflow against an in-process OIDC provider and a real database
npm run test:e2e             # Chromium (iPhone 13 viewport, touch, fake camera) through the built client
```

Database: set `TEST_DATABASE_URL` to an admin connection (each file creates and
drops its own database). Without it the suite uses embedded PostgreSQL (pglite)
in a temp directory. The e2e suite builds the client automatically if
`dist/client` is missing.

### What the integration suite proves (`tests/integration`)

- Unauthenticated access is rejected on every protected route; witnesses cannot read each other's records; non-allowlisted accounts cannot reach the dashboard.
- The real OIDC authorization-code flow (discovery, PKCE, state, nonce, ID-token verification) completes against an in-process provider for both the Google and Microsoft code paths. Only the issuer URL differs from production; the override is refused outside `NODE_ENV=test`.
- Invite links gate statement creation; invalid tokens fail; revocation works.
- Consent, profile and answers are validated server-side; stale privacy-notice versions are refused.
- Resumable uploads in both transports (direct presigned parts, and server-proxied chunks): part/chunk order enforcement, resume after a wrong offset, status endpoint, completion only when every byte arrived, stored bytes identical to the source, SHA-256 and size and receipt time recorded, magic-byte rejection of disguised files, size caps, one-video rule, retake deletes bytes but keeps the audit trail.
- Review returns the exact statement and the statutory affirmation dated today; signing is refused without explicit accuracy and e-sign consent, with a mismatching name, with altered affirmation text, or after the statement changed since review.
- Signing freezes the record: canonical SHA-256 matches, PDF SHA-256 matches the served file, the PDF text contains the evidence ID, the witness's words, the CPLR § 2106 language, hashes and the authentication caveat; no tokens appear anywhere.
- Immutability: API returns 409; direct SQL UPDATE/DELETE on signed statements, signatures, completed media and audit rows is rejected by the database.
- Corrections create version 2 linked to version 1; the original keeps its hash and status.
- Admin: filters (status, submitted date, observation date range), search, detail with account provenance and audit actions, inline video link streaming the original bytes, append-only annotations, per-statement ZIP whose manifest hashes all re-verify, all-records ZIP, CSV/JSON metadata, audit chain verification, privacy request lifecycle.
- MFA: enrollment required, bad codes rejected, replay rejected, new sessions must verify again; admin idle timeout and absolute expiry.
- Rate limiting and CSRF rejection; forged cookies; callback without state; no public evidence endpoints.
- Retention purge removes stale drafts and files but never signed statements.

### What the browser suite proves (`tests/e2e`)

On an emulated iPhone: private link → landing (EN/ES switch) → Google sign-in →
consent → profile → questions (nothing pre-filled) → **camera recording in the
browser** with upload and hash display → retake with a file upload → review →
drawn signature with touch-sized controls → receipt → PDF download whose hash
matches the database → My statements in Spanish without changing the signed
content → admin dashboard list, detail, original video playback, bundle download →
anonymous access denied.

## Manual acceptance (cannot be automated here)

| Check | How | Readiness item |
| --- | --- | --- |
| Real Google sign-in | Sign in with a real Google account on the deployed site | `oauth_google` → READY |
| Real Microsoft sign-in (personal + work) | Sign in with an Outlook.com account and, if relevant, a Microsoft 365 account | `oauth_microsoft` → READY |
| iPhone Safari recording and signing | Open a private link on a current iPhone; record, upload, draw signature | — |
| Android Chrome recording and signing | Same on a current Android phone | — |
| Interrupted upload recovery | Start a large upload, toggle airplane mode for 30 s, confirm it resumes | — |
| ClamAV | Configure `CLAMAV_HOST`; upload the EICAR test file as a document; signing must be blocked until it is removed | `malware` → READY |
| Backup restore | Run `scripts/backup-db.sh`, restore to a scratch DB, re-run an export and compare hashes | `backups` → READY |
