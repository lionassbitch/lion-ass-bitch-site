# Hosting on Vercel (container runtime)

The server runs unchanged as a Docker container on Vercel's container runtime
(beta, all plans). Vercel builds `witness-record/Dockerfile` itself from the
Git repository; no registry push is needed. Function limits apply to
containers, and the application is configured for them:

| Vercel limit | How the app handles it |
| --- | --- |
| 4.5 MB request body | `UPLOAD_MODE=direct`: the browser PUTs 5 MiB parts straight to the Supabase bucket via presigned URLs; only small JSON passes through Vercel. The server then reads the stored object back to hash and type-check it. |
| 300 s per request (Hobby) | Uploads are many short requests; PDFs and videos download via presigned bucket links; evidence ZIPs stream. Very large all-records exports should use `npm run export:records` from any machine with the env values. |
| Scale to zero after 5 idle minutes | `RETENTION_JOB_ENABLED=false`; a Vercel Cron in `vercel.json` calls `GET /api/cron/retention` daily with `CRON_SECRET`. |
| Default port 80 | `PORT=8080` is set as an environment variable; the Dockerfile exposes 8080. |
| Proxied requests | `TRUST_PROXY=true` so client IPs come from `X-Forwarded-For`. |

## One-time setup (dashboard)

The connector used in this session was not permitted to create Vercel
projects or production deployments, so this step is manual:

1. Vercel dashboard → **Add New → Project** → import `lionassbitch/lion-ass-bitch-site`.
2. **Root Directory**: `witness-record`. **Framework Preset**: Container (Vercel
   detects the Dockerfile; `vercel.json` also pins `"framework": "container"`).
3. **Production branch**: `claude/witness-record` until the branch is merged to
   `main` (Settings → Git → Production Branch).
4. Add the environment variables below (Production), then **Deploy**.
5. After the first deploy note the production hostname
   (`the-witness-record-<team>.vercel.app` or the custom domain below) and set
   `BASE_URL` to exactly `https://<that host>`; redeploy.
6. Register `https://<host>/auth/google/callback` and
   `https://<host>/auth/microsoft/callback` with the providers (`docs/OAUTH.md`).
7. Open `https://<host>/admin` → Readiness, and work through anything not READY.

## Custom domain

`lionassbitch.com` is served by Porkbun nameservers, so add at Porkbun:

```
CNAME  witness  cname.vercel-dns.com.
```

then Vercel → Project → Settings → Domains → add `witness.lionassbitch.com`.
Update `BASE_URL` and the OAuth redirect URIs afterwards.

## Environment variables (Production)

Generate secrets with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`.

| Key | Value |
| --- | --- |
| `NODE_ENV` | `production` |
| `PORT` | `8080` |
| `HOST` | `0.0.0.0` |
| `BASE_URL` | `https://<production host>` |
| `TRUST_PROXY` | `true` |
| `SESSION_SECRET` | 64 hex chars (generated) |
| `APP_ENCRYPTION_KEY` | 64 hex chars (generated) |
| `CRON_SECRET` | 48+ random chars (generated); Vercel sends it as the bearer token for the cron |
| `RETENTION_JOB_ENABLED` | `false` |
| `DATABASE_URL` | `postgres://postgres.smdexcrjhjgqruqwwyjs:<DB_PASSWORD>@aws-0-us-east-1.pooler.supabase.com:5432/postgres` (confirm host under Supabase → Connect → Session pooler) |
| `DATABASE_SSL` | `require` |
| `DATABASE_SSL_CA` | PEM from Supabase → Settings → Database → SSL certificate (literal `\n` line breaks). If you skip it, use `DATABASE_SSL=no-verify` knowingly. |
| `STORAGE_DRIVER` | `s3` |
| `S3_ENDPOINT` | `https://smdexcrjhjgqruqwwyjs.storage.supabase.co/storage/v1/s3` |
| `S3_REGION` | `us-east-1` |
| `S3_BUCKET` | `witness-record` |
| `S3_FORCE_PATH_STYLE` | `true` |
| `S3_SSE` | (empty) |
| `S3_ACCESS_KEY_ID` / `S3_SECRET_ACCESS_KEY` | Supabase → Settings → Storage → S3 access keys |
| `UPLOAD_MODE` | `direct` |
| `UPLOAD_CHUNK_BYTES` | `5242880` |
| `ADMIN_ALLOWLIST` | `google:sub:<your Google subject>` (sign in once as a witness; the subject is shown in the dashboard account panel or the `users` table) |
| `ADMIN_MFA_REQUIRED` | `true` |
| `REQUIRE_INVITE_LINK` | `true` |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | from Google Cloud Console |
| `MICROSOFT_CLIENT_ID` / `MICROSOFT_CLIENT_SECRET` / `MICROSOFT_TENANT` | from Entra ID; tenant `common` |
| `COLLECT_IP_ADDRESS` / `COLLECT_USER_AGENT` | `true` |
| `DRAFT_RETENTION_DAYS` | `90` |

The server starts even while the S3 keys or OAuth credentials are missing: the
landing page and readiness checklist work, sign-in buttons are disabled, and
uploads return "storage not configured". Nothing is faked.

## Verifying the deployment

1. `https://<host>/api/health` returns `{"ok":true}`.
2. Dashboard → Readiness: database READY; storage READY; uploads NOT TESTED until the first real upload.
3. Record a test statement from a phone (video + signature), download the PDF, export the bundle, and re-verify the manifest hashes with `sha256sum`.
4. Confirm the cron ran (Vercel → Project → Cron Jobs) and the audit log shows `retention.scheduled_run`.
