import { scriptContext } from "./_context.js";

/** Verifies OAuth/OIDC configuration against the real provider discovery documents. */
const { ctx, close } = await scriptContext();
for (const key of ["google", "microsoft"] as const) {
  const p = ctx.cfg.providers[key];
  if (!p.configured) {
    console.log(`${p.label}: NOT CONFIGURED (set ${key.toUpperCase()}_CLIENT_ID and ${key.toUpperCase()}_CLIENT_SECRET)`);
    continue;
  }
  const r = await ctx.oidc.discoveryCheck(key);
  console.log(`${p.label}: ${r.ok ? "discovery OK" : "discovery FAILED"} — ${r.detail}`);
  console.log(`  redirect URI to register with the provider: ${ctx.oidc.redirectUri(key)}`);
  console.log(`  a real sign-in has not been exercised by this script; complete one in the browser and check the readiness page.`);
}
await close();
