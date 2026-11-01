import crypto from "node:crypto";

// Unambiguous alphabet (no 0/O, 1/I/L) for human-readable evidence IDs.
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

/** Human-friendly evidence identifier, e.g. WR-2026-7KQ4MX2T. Uniqueness is enforced by the database. */
export function newEvidenceId(now = new Date()): string {
  const bytes = crypto.randomBytes(8);
  let s = "";
  for (let i = 0; i < 8; i++) s += ALPHABET[bytes[i] % ALPHABET.length];
  return `WR-${now.getUTCFullYear()}-${s}`;
}

export function mediaEvidenceId(kind: string, now = new Date()): string {
  const bytes = crypto.randomBytes(6);
  let s = "";
  for (let i = 0; i < 6; i++) s += ALPHABET[bytes[i] % ALPHABET.length];
  const prefix = kind === "video" ? "VID" : kind === "document" ? "DOC" : "MED";
  return `${prefix}-${now.getUTCFullYear()}-${s}`;
}
