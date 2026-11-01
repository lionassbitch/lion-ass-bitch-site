import * as OTPAuth from "otpauth";
import { eq } from "drizzle-orm";
import QRCode from "qrcode";
import type { AppContext } from "../context.js";
import { adminMfa } from "../db/schema.js";
import { decryptSecret, encryptSecret } from "../lib/crypto.js";

const ISSUER = "THE WITNESS RECORD";

export function newTotpSecret(): string {
  return new OTPAuth.Secret({ size: 20 }).base32;
}

export async function otpauthUrlAndQr(secretBase32: string, label: string): Promise<{ url: string; qrDataUrl: string }> {
  const totp = new OTPAuth.TOTP({ issuer: ISSUER, label, algorithm: "SHA1", digits: 6, period: 30, secret: OTPAuth.Secret.fromBase32(secretBase32) });
  const url = totp.toString();
  const qrDataUrl = await QRCode.toDataURL(url, { margin: 1, width: 220 });
  return { url, qrDataUrl };
}

export function verifyTotp(secretBase32: string, code: string): number | null {
  const totp = new OTPAuth.TOTP({ issuer: ISSUER, algorithm: "SHA1", digits: 6, period: 30, secret: OTPAuth.Secret.fromBase32(secretBase32) });
  const delta = totp.validate({ token: code.replace(/\s+/g, ""), window: 1 });
  if (delta === null) return null;
  return Math.floor(Date.now() / 1000 / 30) + delta;
}

export async function getEnrollment(ctx: AppContext, userId: string): Promise<{ secret: string; lastUsedStep: number | null } | null> {
  if (!ctx.cfg.encryptionKey) return null;
  const [row] = await ctx.db.select().from(adminMfa).where(eq(adminMfa.userId, userId)).limit(1);
  if (!row) return null;
  return { secret: decryptSecret(ctx.cfg.encryptionKey, row.secretEncrypted), lastUsedStep: row.lastUsedStep };
}

export async function saveEnrollment(ctx: AppContext, userId: string, secret: string): Promise<void> {
  if (!ctx.cfg.encryptionKey) throw new Error("APP_ENCRYPTION_KEY is required for MFA enrollment.");
  const enc = encryptSecret(ctx.cfg.encryptionKey, secret);
  await ctx.db
    .insert(adminMfa)
    .values({ userId, secretEncrypted: enc })
    .onConflictDoUpdate({ target: adminMfa.userId, set: { secretEncrypted: enc, enrolledAt: new Date(), lastUsedStep: null } });
}

/** Rejects reuse of a code within the same 30-second step (replay protection). */
export async function consumeStep(ctx: AppContext, userId: string, step: number, lastUsedStep: number | null): Promise<boolean> {
  if (lastUsedStep !== null && step <= lastUsedStep) return false;
  await ctx.db.update(adminMfa).set({ lastUsedStep: step }).where(eq(adminMfa.userId, userId));
  return true;
}
