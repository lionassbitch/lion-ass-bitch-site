# Readiness checklist

`npm run readiness` (CLI) and **Dashboard → Readiness** produce the same report.
Statuses mean:

- **READY** — configured and observed working (live check or recorded evidence).
- **NOT TESTED** — configured, but no real event has confirmed it (e.g. no real Google login yet).
- **NOT CONFIGURED** — required setting missing, or optional feature disabled.
- **WARNING** — works, but a safer choice exists (e.g. local storage in production).
- **FAILED** — configured but a live check failed.

Items: database migrated; `SESSION_SECRET`; `APP_ENCRYPTION_KEY`; HTTPS origin;
Google sign-in; Microsoft sign-in; admin allowlist + MFA; private storage
health; ClamAV; audit chain; private links; backups verified; retention
policy; technical metadata disclosure; transcription (always NOT CONFIGURED:
not implemented by design).

State of this build as delivered (no production environment configured):

| Item | State |
| --- | --- |
| Application code, schema, triggers, PDF, bundles, dashboard | READY (automated tests pass) |
| Google / Microsoft sign-in | NOT CONFIGURED until you register OAuth apps; NOT TESTED until a real login completes |
| Admin allowlist / MFA | NOT CONFIGURED until `ADMIN_ALLOWLIST` and `APP_ENCRYPTION_KEY` are set; NOT TESTED until first admin sign-in |
| S3 storage | NOT CONFIGURED until bucket credentials are set |
| ClamAV | NOT CONFIGURED (optional) |
| Backups | NOT TESTED until a restore test is recorded |
| Transcription | NOT CONFIGURED (not implemented) |
