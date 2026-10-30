import { eq, and } from "drizzle-orm";
import { scriptContext } from "./_context.js";
import { adminMfa, users } from "../server/src/db/schema.js";

/**
 * Removes an administrator's TOTP enrollment so they can enroll a new device.
 * Requires server access by design (there is no self-service reset).
 *   npm run admin:reset-mfa -- google sub:1234567890
 *   npm run admin:reset-mfa -- microsoft email:owner@example.org
 */
const [provider, selector] = process.argv.slice(2);
if (!provider || !selector) {
  console.error("usage: reset-admin-mfa <google|microsoft> <sub:ID | email:ADDRESS>");
  process.exit(2);
}
const { ctx, close } = await scriptContext();
const [kind, value] = selector.split(/:(.*)/s);
const where = kind === "sub" ? and(eq(users.provider, provider), eq(users.providerSubject, value)) : and(eq(users.provider, provider), eq(users.email, value.toLowerCase()));
const [u] = await ctx.db.select().from(users).where(where).limit(1);
if (!u) {
  console.error("no such user");
  await close();
  process.exit(1);
}
const deleted = await ctx.db.delete(adminMfa).where(eq(adminMfa.userId, u.id)).returning();
await ctx.audit.record({ actorType: "system", actorUserId: u.id, action: "admin.mfa_reset_by_operator", detail: { provider, selector: kind } });
console.log(deleted.length ? `MFA enrollment removed for ${u.email ?? u.providerSubject}` : "user had no enrollment");
await close();
