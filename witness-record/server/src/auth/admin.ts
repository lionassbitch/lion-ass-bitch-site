import type { AdminAllowEntry } from "../config.js";

export interface IdentityForAllowlist {
  provider: "google" | "microsoft";
  providerSubject: string;
  email: string | null;
  emailVerified: boolean;
}

/**
 * Admin identity is an explicit allowlist match — never "first user wins".
 * Email entries only match when the provider asserted the email as verified.
 */
export function matchesAdminAllowlist(entries: AdminAllowEntry[], identity: IdentityForAllowlist): AdminAllowEntry | null {
  for (const e of entries) {
    if (e.provider !== identity.provider) continue;
    if (e.kind === "sub" && e.value === identity.providerSubject) return e;
    if (e.kind === "email" && identity.email && identity.emailVerified && e.value === identity.email.toLowerCase()) return e;
  }
  return null;
}
