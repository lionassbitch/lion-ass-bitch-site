# Supabase project (provisioned)

Provisioned on 2026-11-01 from this repository's migrations. Supabase holds the
database and the private bucket; the Node server itself still needs a host
(Render, Fly.io, Railway, or a Replit Reserved VM) using the `Dockerfile`.

| Item | Value |
| --- | --- |
| Organization | lionassbitch's Org (`sxsutndxcemwljrefpqq`) |
| Project | `the-witness-record`, ref `smdexcrjhjgqruqwwyjs`, region us-east-1, PostgreSQL 17 |
| Dashboard | https://supabase.com/dashboard/project/smdexcrjhjgqruqwwyjs |
| API URL (not used by the app) | https://smdexcrjhjgqruqwwyjs.supabase.co |
| Direct DB host | `db.smdexcrjhjgqruqwwyjs.supabase.co:5432` (IPv6 on the free plan; most hosts need the pooler below) |
| Session pooler | `aws-0-us-east-1.pooler.supabase.com:5432`, user `postgres.smdexcrjhjgqruqwwyjs` (confirm under **Connect** in the dashboard) |
| Bucket | `witness-record`, private, 1 GiB per-object limit |
| Migrations applied | `0001_initial.sql`, `0002_lock_down_api_roles.sql` (recorded in `schema_migrations`, so the server's own runner will not re-apply them) |

## What the lock-down migration did

All application tables have row-level security enabled with no policies and
every privilege revoked from `anon`, `authenticated` and `service_role`.
Verified after applying: `has_table_privilege('anon', …)` and
`has_table_privilege('service_role', …)` are false on every table. Witness data
is therefore unreachable through the Supabase REST API, the client keys, or the
dashboard's API explorer. The server connects as the `postgres` owner role,
which bypasses RLS, so the application is unaffected. The same migration is a
no-op on plain PostgreSQL apart from enabling RLS.

## Values you must obtain from the dashboard

1. **Database password**: Settings → Database → *Reset database password*.
   The password generated at creation was not returned to this session.
2. **CA certificate**: Settings → Database → SSL → *Download certificate*;
   paste its PEM into `DATABASE_SSL_CA` (literal `\n` for line breaks) so
   `DATABASE_SSL=require` verifies the server.
3. **S3 access keys**: Settings → Storage → *S3 Access Keys* → *New access key*
   (enable "connection via S3 protocol" if prompted). Scope the key to this
   project only.

## Environment values for the Node host

```
DATABASE_URL=postgres://postgres.smdexcrjhjgqruqwwyjs:<DB_PASSWORD>@aws-0-us-east-1.pooler.supabase.com:5432/postgres
DATABASE_SSL=require
DATABASE_SSL_CA=-----BEGIN CERTIFICATE-----\n...\n-----END CERTIFICATE-----
STORAGE_DRIVER=s3
S3_ENDPOINT=https://smdexcrjhjgqruqwwyjs.storage.supabase.co/storage/v1/s3
S3_REGION=us-east-1
S3_BUCKET=witness-record
S3_FORCE_PATH_STYLE=true
S3_SSE=
S3_ACCESS_KEY_ID=<from dashboard>
S3_SECRET_ACCESS_KEY=<from dashboard>
UPLOAD_CHUNK_BYTES=5242880
```

Notes:
- `S3_SSE` is empty because Supabase Storage encrypts at rest itself and does
  not accept the AWS SSE header. The readiness page will report "No SSE header
  sent; rely on bucket default encryption", which is accurate.
- Supabase Storage supports S3 multipart uploads, which the resumable upload
  path uses; keep the chunk size at 5 MiB or more.
- Keep the bucket private. The app only ever issues presigned links that expire
  after `DOWNLOAD_LINK_TTL_SECONDS`.
- Add the Node host's public origin as `BASE_URL`, then register
  `https://<host>/auth/google/callback` and `https://<host>/auth/microsoft/callback`
  with the providers (`docs/OAUTH.md`).

## Backups

Supabase takes daily backups on paid plans; the free plan does not include
point-in-time recovery. Run `scripts/backup-db.sh` against the pooler URL on a
schedule and store the dumps off-platform. Storage objects should be mirrored
with `rclone sync` to a second provider. Record a successful restore test in
`BACKUP_LAST_VERIFIED`.

## Verifying after deploy

1. `npm run readiness` on the host (or Dashboard → Readiness): database READY, storage READY.
2. Complete one real Google and one real Microsoft sign-in.
3. Record a short test statement from a phone, sign it, export the bundle, and
   confirm the manifest hashes match the files.
