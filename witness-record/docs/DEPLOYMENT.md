# Deployment

THE WITNESS RECORD is a long-running Node.js 22 server (Fastify) that serves
the built React client, talks to PostgreSQL and an S3-compatible bucket, and
needs a stable public HTTPS origin. It is not a serverless/static site.

## Options

- **Container** (recommended): `Dockerfile` builds a minimal non-root image.
  Run it on Fly.io, Render, Railway, AWS ECS/App Runner, Google Cloud Run, or a VM.
- **Reference compose stack**: `docker-compose.yml` wires the app, PostgreSQL 16,
  MinIO (S3-compatible) and ClamAV for a single-host deployment:
  `POSTGRES_PASSWORD=… MINIO_ROOT_PASSWORD=… docker compose up -d --build`
  (then create the `witness-record` bucket in MinIO and keep it private).
- **Bare Node**: `npm ci && npm run build && NODE_ENV=production node dist/server/index.js`
  behind a reverse proxy (Caddy/nginx) with `TRUST_PROXY=true`.

## Domain and TLS

- Choose a dedicated hostname (e.g. `witness.yourdomain.org`). Set `BASE_URL`
  to it; production refuses http.
- Terminate TLS at the platform or proxy; HSTS is sent by the app.
- Register the exact `https://<host>/auth/<provider>/callback` URIs with Google and Microsoft (`docs/OAUTH.md`).

## Database

A Supabase project is already provisioned for this case; see `docs/SUPABASE.md` for its values.

Use managed PostgreSQL (RDS, Cloud SQL, Neon, Supabase, Fly Postgres…) with
TLS (`DATABASE_SSL=require`), automated snapshots and point-in-time recovery.
Give the app a role that owns the schema but is not a superuser; keep superuser
credentials offline (only the documented manual deletion procedure needs them).

## Private storage

Create a private bucket with default encryption and public access blocked.
Enable **object versioning** (and, on AWS, Object Lock in governance mode if
you want WORM protection for originals). Give the app a key scoped to that
bucket only. Multipart uploads require `UPLOAD_CHUNK_BYTES ≥ 5 MiB` (default).

## Secret management

Store `SESSION_SECRET`, `APP_ENCRYPTION_KEY`, OAuth secrets and storage keys in
the platform's secret store (Fly secrets, Render env groups, AWS Secrets
Manager, Doppler, 1Password…). Never commit `.env`. Rotate the Microsoft
client secret before it expires; rotating `SESSION_SECRET` signs everyone out;
rotating `APP_ENCRYPTION_KEY` requires admins to re-enroll MFA.

## Backups

- Database: `scripts/backup-db.sh` (pg_dump custom format + sha256). Schedule
  daily off-site copies in addition to the provider's snapshots.
- Media: bucket versioning + cross-region replication, or a nightly `rclone sync` to a second provider.
- **Test a restore** into a scratch database and verify a bundle re-verifies
  (`npm run export:records` → hashes match). Record the date in
  `BACKUP_LAST_VERIFIED` so the readiness page reflects it.

## Publishing checklist

1. `npm run readiness` shows no NOT CONFIGURED / FAILED items except those you accept (ClamAV, transcription).
2. Complete one real Google and one real Microsoft sign-in; readiness flips them to READY.
3. Enroll the admin authenticator; confirm the dashboard opens on a new session only after a code.
4. Create a private link, open it on a phone, record a 10-second test video, sign, download the PDF, then export the bundle and verify hashes. Delete the test statement via the manual procedure or keep it labelled with an annotation.
5. Confirm backups ran and a restore was tested.
6. Only then send invitation messages, individually.

## Record export for counsel

- Dashboard → **Export all records (ZIP)**: every statement in its own folder with manifest, audit summary, frozen record, signature record, provenance, PDF and originals, plus `index.csv`/`index.json`.
- `npm run export:records -- ./exports` does the same from the server.
- Each manifest lists SHA-256 for every file so counsel can re-verify independently (`sha256sum`).
