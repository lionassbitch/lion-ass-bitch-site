import { describe, it, expect, beforeAll, afterAll } from "vitest";
import * as OTPAuth from "otpauth";
import { startTestApp, completeDraft, signStatement, type TestApp } from "../helpers/app.js";

describe("admin MFA, allowlist and session controls", () => {
  let t: TestApp;
  beforeAll(async () => {
    t = await startTestApp({ ADMIN_MFA_REQUIRED: "true", REQUIRE_INVITE_LINK: "false", ADMIN_SESSION_IDLE_MINUTES: "20" });
  });
  afterAll(async () => t.close());

  it("admin identity comes only from the explicit allowlist, never from being first", async () => {
    const first = await t.login({ sub: "first-user", email: "first@example.test", name: "First" });
    const me = await t.api(first, "GET", "/api/me");
    expect(me.json.session.isAdmin).toBe(false);
    const dash = await t.api(first, "GET", "/api/admin/overview");
    expect(dash.status).toBe(403);
    // Email-form allowlist entries only match provider-verified emails.
    const unverified = await t.login({ sub: "ms-x", email: "owner@example.test", name: "Owner?", emailVerified: false }, "microsoft");
    expect((await t.api(unverified, "GET", "/api/me")).json.session.isAdmin).toBe(false);
    const verified = await t.login({ sub: "ms-y", email: "owner@example.test", name: "Owner", emailVerified: true }, "microsoft");
    expect((await t.api(verified, "GET", "/api/me")).json.session.isAdmin).toBe(true);
  });

  it("requires TOTP enrollment and verification before any dashboard data is served", async () => {
    const admin = await t.login({ sub: "admin-1", email: "eddie@example.test", name: "Eddie" });
    const blocked = await t.api(admin, "GET", "/api/admin/statements");
    expect(blocked.status).toBe(403);
    expect(blocked.json.error).toBe("mfa_enroll_required");

    const start = await t.api(admin, "POST", "/api/admin/mfa/enroll/start");
    expect(start.status).toBe(200);
    expect(start.json.qrDataUrl).toMatch(/^data:image\/png/);
    expect(start.json.otpauthUrl).toMatch(/^otpauth:\/\/totp\//);
    const enrollCookie = (Array.isArray(start.headers["set-cookie"]) ? start.headers["set-cookie"] : [start.headers["set-cookie"] as string]).find((c) => c.startsWith("wr_mfa_enroll="))!.split(";")[0];
    const totp = new OTPAuth.TOTP({ secret: OTPAuth.Secret.fromBase32(start.json.manualKey), digits: 6, period: 30 });
    const bad = await t.api(`${admin}; ${enrollCookie}`, "POST", "/api/admin/mfa/enroll/confirm", { code: "000000" });
    expect(bad.status).toBe(400);
    const ok = await t.api(`${admin}; ${enrollCookie}`, "POST", "/api/admin/mfa/enroll/confirm", { code: totp.generate() });
    expect(ok.status).toBe(200);
    const list = await t.api(admin, "GET", "/api/admin/statements");
    expect(list.status).toBe(200);

    // A fresh session must verify again; a reused code is rejected (replay protection).
    const again = await t.login({ sub: "admin-1", email: "eddie@example.test", name: "Eddie" });
    const needs = await t.api(again, "GET", "/api/admin/statements");
    expect(needs.json.error).toBe("mfa_required");
    const code = totp.generate();
    const v1 = await t.api(again, "POST", "/api/admin/mfa/verify", { code });
    // The first use of this time step was consumed during enrollment if we are still in the same 30s window.
    if (v1.status === 400) {
      await new Promise((r) => setTimeout(r, (30 - (Math.floor(Date.now() / 1000) % 30)) * 1000 + 200));
      const v1b = await t.api(again, "POST", "/api/admin/mfa/verify", { code: totp.generate() });
      expect(v1b.status).toBe(200);
    } else {
      expect(v1.status).toBe(200);
    }
    const replay = await t.api(again, "POST", "/api/admin/mfa/verify", { code: totp.generate() });
    expect(replay.status).toBe(400);
    expect((await t.api(again, "GET", "/api/admin/readiness")).status).toBe(200);
  });

  it("expires idle admin sessions and absolute session lifetimes", async () => {
    const admin = await t.login({ sub: "admin-1", email: "eddie@example.test", name: "Eddie" });
    await t.ctx.dbHandle.exec("UPDATE sessions SET last_seen_at = now() - interval '25 minutes' WHERE is_admin = true");
    const me = await t.api(admin, "GET", "/api/me");
    expect(me.status).toBe(401);
    const w = await t.login({ sub: "w", email: "w@example.test", name: "W" });
    await t.ctx.dbHandle.exec("UPDATE sessions SET expires_at = now() - interval '1 minute'");
    expect((await t.api(w, "GET", "/api/me")).status).toBe(401);
  });

  it("shows error-state and incomplete submissions without presenting them as signed evidence", async () => {
    const admin = await t.login({ sub: "admin-1", email: "eddie@example.test", name: "Eddie" });
    const totpRow = await t.ctx.dbHandle.exec("SELECT secret_encrypted FROM admin_mfa LIMIT 1");
    expect(totpRow.rows.length).toBe(1);
    // Verify via a code generated from the stored (decrypted) secret.
    const { getEnrollment } = await import("../../server/src/auth/mfa.js");
    const users = await t.ctx.dbHandle.exec("SELECT id FROM users WHERE provider_subject = 'admin-1'");
    const enrollment = await getEnrollment(t.ctx, users.rows[0].id as string);
    const totp = new OTPAuth.TOTP({ secret: OTPAuth.Secret.fromBase32(enrollment!.secret), digits: 6, period: 30 });
    await new Promise((r) => setTimeout(r, (30 - (Math.floor(Date.now() / 1000) % 30)) * 1000 + 200));
    expect((await t.api(admin, "POST", "/api/admin/mfa/verify", { code: totp.generate() })).status).toBe(200);

    const w = await t.login({ sub: "w-incomplete", email: "wi@example.test", name: "WI" });
    const draft = await t.api(w, "POST", "/api/statements", { language: "en" });
    const w2 = await t.login({ sub: "w-complete", email: "wc@example.test", name: "WC" });
    const id = await completeDraft(t, w2);
    const { res } = await signStatement(t, w2, id, "typed");
    expect(res.status).toBe(200);
    const list = await t.api(admin, "GET", "/api/admin/statements");
    const incomplete = list.json.statements.find((s: { id: string }) => s.id === draft.json.statement.id);
    expect(incomplete.status).toBe("draft");
    expect(incomplete.hasConsent).toBe(false);
    expect(incomplete.hasAnswers).toBe(false);
    const signedOnly = await t.api(admin, "GET", "/api/admin/statements?status=signed");
    expect(signedOnly.json.statements.every((s: { status: string }) => s.status === "signed")).toBe(true);
    expect(signedOnly.json.statements.some((s: { id: string }) => s.id === draft.json.statement.id)).toBe(false);
    const detail = await t.api(admin, "GET", `/api/admin/statements/${draft.json.statement.id}`);
    expect(detail.json.signature).toBeNull();
    expect(detail.json.statement.frozenRecordSha256).toBeNull();
    const bundle = await t.api(admin, "GET", `/api/admin/statements/${draft.json.statement.id}/bundle.zip`);
    expect(bundle.status).toBe(200);
    const readiness = await t.api(admin, "GET", "/api/admin/readiness");
    const byKey = Object.fromEntries(readiness.json.items.map((i: { key: string; status: string }) => [i.key, i.status]));
    expect(byKey.database).toBe("READY");
    expect(byKey.malware).toBe("NOT CONFIGURED");
    expect(byKey.transcription).toBe("NOT CONFIGURED");
    expect(byKey.backups).toBe("NOT TESTED");
    expect(byKey.oauth_google).toBe("NOT TESTED"); // test issuer is not accounts.google.com
    expect(byKey.audit).toBe("READY");
  });
});

describe("abuse controls", () => {
  it("rate-limits sensitive endpoints and rejects cross-site mutations", async () => {
    const t = await startTestApp({ REQUIRE_INVITE_LINK: "false" });
    try {
      let limited = false;
      for (let i = 0; i < 40; i++) {
        const r = await t.api(null, "POST", "/api/invite/open", { token: "x".repeat(20) });
        if (r.status === 429) {
          limited = true;
          break;
        }
      }
      expect(limited).toBe(true);
      const cookie = await t.login({ sub: "w", email: "w@example.test", name: "W" });
      const noHeader = await t.app.inject({ method: "POST", url: "/api/statements", payload: { language: "en" }, headers: { cookie, origin: t.baseUrl, "content-type": "application/json" } });
      expect(noHeader.statusCode).toBe(403);
      const badOrigin = await t.app.inject({ method: "POST", url: "/api/statements", payload: { language: "en" }, headers: { cookie, origin: "https://attacker.example", "x-requested-with": "XMLHttpRequest", "content-type": "application/json" } });
      expect(badOrigin.statusCode).toBe(403);
      // Forged / tampered session cookies are ignored.
      const forged = await t.api("wr_session=AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA", "GET", "/api/me");
      expect(forged.status).toBe(401);
      // OAuth callback without the state cookie is refused.
      const cb = await t.app.inject({ method: "GET", url: "/auth/google/callback?code=abc&state=xyz" });
      expect(cb.statusCode).toBe(302);
      expect(cb.headers.location).toContain("/sign-in?error=state");
      // No public evidence endpoints exist.
      for (const u of ["/api/statements/public", "/api/evidence", "/api/videos", "/api/witnesses", "/api/admin/statements"]) expect([401, 404]).toContain((await t.api(null, "GET", u)).status);
      const html = await t.app.inject({ method: "GET", url: "/api/anything" });
      expect(html.headers["x-robots-tag"]).toContain("noindex");
    } finally {
      await t.close();
    }
  });

  it("refuses to start sign-in for an unconfigured provider instead of faking it", async () => {
    const t = await startTestApp({ MICROSOFT_CLIENT_ID: "", MICROSOFT_CLIENT_SECRET: "" });
    try {
      const cfg = await t.api(null, "GET", "/api/config");
      expect(cfg.json.providers.microsoft.configured).toBe(false);
      const start = await t.app.inject({ method: "GET", url: "/auth/microsoft/start" });
      expect(start.statusCode).toBe(503);
      expect(start.json().error).toBe("provider_not_configured");
    } finally {
      await t.close();
    }
  });
});
