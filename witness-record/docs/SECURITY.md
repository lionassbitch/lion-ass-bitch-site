# Security and privacy model

## Goals

1. Preserve each witness's own words and files exactly as given.
2. Make any later alteration detectable.
3. Keep every record private to the witness, the case owner, and the people the
   case owner lawfully shares it with.
4. Say only what the system can actually substantiate.

## Controls

| Concern | Control |
| --- | --- |
| Identity of the submitting account | OpenID Connect with Google/Microsoft; PKCE, `state`, `nonce`; ID-token signature/issuer/audience/expiry validation; provider subject + issuer stored; no tokens stored |
| Sessions | Random 256-bit token, stored hashed; `HttpOnly`/`SameSite=Lax`/`Secure` cookie; absolute TTL and idle timeout (shorter for admins); revocation on logout; admin status re-checked against the allowlist on every request |
| CSRF | `Origin` must equal `BASE_URL`; `X-Requested-With: XMLHttpRequest` required on all mutating API calls; SameSite cookies |
| Authorization | Witnesses can read/write only their own statements (`user_id` scoped queries); admin routes require allowlist + TOTP MFA |
| Admin MFA | TOTP (RFC 6238), secrets encrypted at rest with AES-256-GCM, per-step replay protection, enrollment only from an allowlisted session, reset only via server-side script |
| Input validation | zod schemas for every payload; uploads validated by magic bytes and size before bytes are kept; signature PNGs checked for the PNG header and size |
| Transport | HTTPS required in production (`BASE_URL`), HSTS, strict CSP (`default-src 'self'`, no inline scripts), `frame-ancestors 'none'`, `Referrer-Policy: no-referrer`, `X-Robots-Tag: noindex` on all app responses, `robots.txt` disallow |
| Storage | Private bucket; presigned links expire in minutes; `S3_SSE` header; local driver uses HMAC-signed expiring links |
| Rate limiting | Global 600/min per IP; stricter on sign-in, invite opening, signing, link issuance, exports |
| Integrity | SHA-256 of every stored file computed from the stored bytes at receipt; canonical-JSON SHA-256 of the frozen signed record; PDF SHA-256; hash-chained audit log; DB triggers forbid UPDATE/DELETE on finalized evidence |
| Logging | pino with cookie/authorization redaction; no request bodies logged; witness content never logged |
| Secrets | Environment only; validated at boot; production refuses to start without `SESSION_SECRET`; ephemeral dev secrets are flagged |
| Abuse | Invite-link gating, rate limits, upload size caps, one video per statement, document cap |

## Audit log

`audit_events` is append-only (trigger) and hash-chained: each row stores
`prev_hash` and `entry_hash = SHA-256(prev_hash ‖ canonical(entry))`. Appends
are serialized with a transaction-scoped advisory lock. **Dashboard → Audit
log → Verify chain** recomputes every hash. Every admin view, playback link,
download link and export is logged with the admin's user ID, IP and user agent.

## Technical metadata

With `COLLECT_IP_ADDRESS`/`COLLECT_USER_AGENT` enabled (default) the system
records client IP and browser user agent on sessions, uploads, signatures and
audit entries. Purpose: abuse control and signing provenance. Disclosed in the
consent notice and the protection page. Not collected: device location,
government ID, biometrics, contacts, files.

## Malware screening

Optional ClamAV daemon (`CLAMAV_HOST`/`CLAMAV_PORT`, INSTREAM protocol). When
configured, every completed upload is scanned and the verdict is frozen into
the record; an infected attachment blocks signing until removed. When not
configured, the readiness page, manifests and audit summaries say so
explicitly. Type validation by magic bytes always applies.

## Transcription

Not implemented. Original video is preserved as received, with no derivative
transcript. If a transcript is ever produced outside the system it must be
labelled an unverified derivative and must not replace the original.

## What the system does not claim

- It does not verify government identity, physical presence, or truthfulness.
- It does not notarize documents or guarantee admissibility.
- It cannot attest to anything that happened on a witness's device before
  upload (e.g. that a video was not edited before being uploaded). It records
  whether a video was captured live in the browser or uploaded as a file.
- Hash-chain and trigger protections cover the application and database layer;
  a party with direct superuser database access and the ability to rewrite
  every hash could still alter history. Mitigate with restricted DB roles,
  managed-database audit logging and off-site backups (see DEPLOYMENT.md).

## Reporting a vulnerability

Contact the case owner directly (`CASE_OWNER_CONTACT_EMAIL`). Do not open a
public issue containing witness data.
