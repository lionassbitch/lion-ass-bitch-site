import * as client from "openid-client";
import type { AppConfig, ProviderConfig } from "../config.js";

export type ProviderKey = "google" | "microsoft";

export interface VerifiedIdentity {
  provider: ProviderKey;
  issuer: string;
  subject: string;
  email: string | null;
  emailVerified: boolean;
  displayName: string | null;
  authenticatedAt: Date;
}

export interface LoginStart {
  url: string;
  state: string;
  nonce: string;
  codeVerifier: string;
}

/**
 * Genuine OpenID Connect (authorization code + PKCE) against Google and
 * Microsoft. Discovery documents are fetched from the real issuers; ID tokens
 * are validated (signature via JWKS, issuer, audience, expiry, nonce) by
 * openid-client. Only the minimal "openid email profile" scopes are requested,
 * so the provider never gains access to anything in this application and the
 * application never asks for access to the witness's mailbox or files.
 */
export class OidcService {
  private configs = new Map<ProviderKey, Promise<client.Configuration>>();

  constructor(private readonly cfg: AppConfig) {}

  providerConfig(key: ProviderKey): ProviderConfig {
    return this.cfg.providers[key];
  }

  isConfigured(key: ProviderKey): boolean {
    return this.cfg.providers[key].configured;
  }

  redirectUri(key: ProviderKey): string {
    return new URL(`/auth/${key}/callback`, this.cfg.baseUrl).toString();
  }

  private async configuration(key: ProviderKey): Promise<client.Configuration> {
    const p = this.cfg.providers[key];
    if (!p.configured) throw new Error(`${p.label} sign-in is not configured.`);
    let pending = this.configs.get(key);
    if (!pending) {
      const execute: ((c: client.Configuration) => void)[] = [];
      // Test-only: the in-process OIDC test provider runs over plain http.
      if (this.cfg.isTest && p.issuer.startsWith("http://")) execute.push(client.allowInsecureRequests);
      pending = client
        .discovery(new URL(p.issuer), p.clientId, p.clientSecret, undefined, { execute })
        .catch((err) => {
          this.configs.delete(key);
          throw err;
        });
      this.configs.set(key, pending);
    }
    return pending;
  }

  async discoveryCheck(key: ProviderKey): Promise<{ ok: boolean; detail: string }> {
    try {
      const c = await this.configuration(key);
      const md = c.serverMetadata();
      return { ok: true, detail: `issuer ${md.issuer}; authorization endpoint ${md.authorization_endpoint}` };
    } catch (err) {
      return { ok: false, detail: (err as Error).message };
    }
  }

  async startLogin(key: ProviderKey): Promise<LoginStart> {
    const config = await this.configuration(key);
    const codeVerifier = client.randomPKCECodeVerifier();
    const codeChallenge = await client.calculatePKCECodeChallenge(codeVerifier);
    const state = client.randomState();
    const nonce = client.randomNonce();
    const params: Record<string, string> = {
      redirect_uri: this.redirectUri(key),
      scope: this.cfg.providers[key].scopes,
      code_challenge: codeChallenge,
      code_challenge_method: "S256",
      state,
      nonce,
    };
    if (key === "google") params.prompt = "select_account";
    const url = client.buildAuthorizationUrl(config, params);
    return { url: url.toString(), state, nonce, codeVerifier };
  }

  async finishLogin(key: ProviderKey, currentUrl: URL, expected: { state: string; nonce: string; codeVerifier: string }): Promise<VerifiedIdentity> {
    const config = await this.configuration(key);
    const tokens = await client.authorizationCodeGrant(config, currentUrl, {
      expectedState: expected.state,
      expectedNonce: expected.nonce,
      pkceCodeVerifier: expected.codeVerifier,
      idTokenExpected: true,
    });
    const claims = tokens.claims();
    if (!claims || !claims.sub) throw new Error("ID token did not include a subject.");
    // Tokens are used only to establish identity here; they are never stored
    // and never appear in any evidence export.
    const email = typeof claims.email === "string" ? claims.email : null;
    let emailVerified = claims.email_verified === true;
    if (key === "microsoft" && email && claims.email_verified === undefined) {
      // Microsoft identity platform omits email_verified; the "email" claim is
      // the account's primary address but we do not call it verified.
      emailVerified = false;
    }
    const name = typeof claims.name === "string" ? claims.name : null;
    return {
      provider: key,
      issuer: String(claims.iss),
      subject: String(claims.sub),
      email,
      emailVerified,
      displayName: name,
      authenticatedAt: new Date(),
    };
  }
}
