# OAuth / OpenID Connect provider setup

Both providers use the OpenID Connect authorization-code flow with PKCE,
`state` and `nonce`. ID tokens are validated against the provider's JWKS. Only
`openid email profile` scopes are requested: the application never gains access
to mail, files or contacts, and the provider never gains access to witness data.
No access or refresh tokens are stored.

Redirect URIs to register (replace the host with your `BASE_URL`):

```
https://witness.example.org/auth/google/callback
https://witness.example.org/auth/microsoft/callback
```

`npm run check:oidc` prints the exact URIs and verifies each provider's
discovery document with your credentials.

## Google

1. Google Cloud Console → **APIs & Services → OAuth consent screen**.
   User type **External**, publishing status **In production** (otherwise only
   test users can sign in). App name "THE WITNESS RECORD", support email, your
   domain. Scopes: `openid`, `email`, `profile` only.
2. **Credentials → Create credentials → OAuth client ID → Web application**.
   Authorized redirect URI: `https://<host>/auth/google/callback`.
3. Set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`.

Google asserts `email_verified`; the dashboard shows it.

## Microsoft (Entra ID / personal accounts)

1. Entra admin center → **App registrations → New registration**.
   Supported account types: **Accounts in any organizational directory and personal Microsoft accounts** (this is what `MICROSOFT_TENANT=common` expects; use `consumers` for personal-only, `organizations` for work/school-only, or a tenant ID to restrict to one organization).
   Redirect URI (Web): `https://<host>/auth/microsoft/callback`.
2. **Certificates & secrets → New client secret**; note the expiry and rotate before it lapses.
3. **API permissions**: Microsoft Graph delegated `openid`, `email`, `profile` (default). No admin consent needed.
4. Set `MICROSOFT_CLIENT_ID`, `MICROSOFT_CLIENT_SECRET`, `MICROSOFT_TENANT`.

Notes:
- With `common`, the discovery issuer contains `{tenantid}`; `openid-client`
  validates each ID token's `iss` against the token's own `tid`.
- Microsoft tokens do not carry `email_verified`; the app records the email
  claim but marks it "not marked verified by provider". Use `sub`-based
  allowlist entries for Microsoft administrators.
- Organizational tenants may block consent for multi-tenant apps; that is a
  policy of the witness's organization, not something the app can bypass.

## Verifying a real login

Configuration alone is reported as **NOT TESTED** on the readiness page. After
you (or a test witness) complete a real sign-in, the sessions table records
the issuer (`accounts.google.com` / `login.microsoftonline.com/...`) and the
item flips to **READY**. Do this before distributing links.

## What sign-in does and does not establish

Sign-in shows that the named account was used to submit and sign a statement
at a recorded time. It is not government ID verification, not proof of
physical presence, and not verification of truthfulness. The witness's legal
name is collected separately and both are preserved.
