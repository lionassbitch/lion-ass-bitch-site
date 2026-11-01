import { sql } from "drizzle-orm";
import type { Db } from "../db/client.js";
import { auditEvents } from "../db/schema.js";
import { canonicalJson } from "../lib/canonical.js";
import { sha256Hex } from "../lib/crypto.js";

export type ActorType = "witness" | "admin" | "system" | "anonymous";

export interface AuditInput {
  actorType: ActorType;
  actorUserId?: string | null;
  sessionId?: string | null;
  statementId?: string | null;
  mediaAssetId?: string | null;
  action: string;
  detail?: Record<string, unknown>;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export const GENESIS_HASH = "0".repeat(64);

export function computeEntryHash(prevHash: string, entry: Omit<AuditInput, "detail"> & { detail: Record<string, unknown>; occurredAt: string }): string {
  return sha256Hex(
    prevHash +
      canonicalJson({
        occurredAt: entry.occurredAt,
        actorType: entry.actorType,
        actorUserId: entry.actorUserId ?? null,
        sessionId: entry.sessionId ?? null,
        statementId: entry.statementId ?? null,
        mediaAssetId: entry.mediaAssetId ?? null,
        action: entry.action,
        detail: entry.detail,
        ipAddress: entry.ipAddress ?? null,
        userAgent: entry.userAgent ?? null,
      }),
  );
}

/**
 * Append-only, hash-chained audit log. Each entry's hash covers the previous
 * entry's hash, so any later alteration or deletion is detectable by
 * verifyAuditChain(). The database trigger additionally forbids UPDATE/DELETE.
 */
export class AuditService {
  constructor(private readonly db: Db) {}

  async record(input: AuditInput, executor?: Db): Promise<{ id: number; entryHash: string }> {
    const detail = input.detail ?? {};
    const runner = (executor ?? this.db) as Db;
    return runner.transaction(async (tx) => {
      // Serialize appends so the chain is linear even under concurrent requests.
      await tx.execute(sql`SELECT pg_advisory_xact_lock(7340001)`);
      const last = await tx.execute(sql`SELECT entry_hash FROM audit_events ORDER BY id DESC LIMIT 1`);
      const rows = (last as unknown as { rows?: { entry_hash: string }[] }).rows ?? (last as unknown as { entry_hash: string }[]);
      const prevHash = rows.length ? rows[0].entry_hash : GENESIS_HASH;
      const occurredAt = new Date();
      const entryHash = computeEntryHash(prevHash, { ...input, detail, occurredAt: occurredAt.toISOString() });
      const [row] = await tx
        .insert(auditEvents)
        .values({
          occurredAt,
          actorType: input.actorType,
          actorUserId: input.actorUserId ?? null,
          sessionId: input.sessionId ?? null,
          statementId: input.statementId ?? null,
          mediaAssetId: input.mediaAssetId ?? null,
          action: input.action,
          detail,
          ipAddress: input.ipAddress ?? null,
          userAgent: input.userAgent ?? null,
          prevHash,
          entryHash,
        })
        .returning({ id: auditEvents.id });
      return { id: row.id, entryHash };
    });
  }

  /** Recomputes every hash in order. Returns the first broken link, if any. */
  async verifyChain(): Promise<{ ok: boolean; count: number; brokenAtId: number | null }> {
    const rows = await this.db.select().from(auditEvents).orderBy(auditEvents.id);
    let prev = GENESIS_HASH;
    for (const r of rows) {
      if (r.prevHash !== prev) return { ok: false, count: rows.length, brokenAtId: r.id };
      const expected = computeEntryHash(prev, {
        occurredAt: r.occurredAt.toISOString(),
        actorType: r.actorType as ActorType,
        actorUserId: r.actorUserId,
        sessionId: r.sessionId,
        statementId: r.statementId,
        mediaAssetId: r.mediaAssetId,
        action: r.action,
        detail: r.detail,
        ipAddress: r.ipAddress,
        userAgent: r.userAgent,
      });
      if (expected !== r.entryHash) return { ok: false, count: rows.length, brokenAtId: r.id };
      prev = r.entryHash;
    }
    return { ok: true, count: rows.length, brokenAtId: null };
  }
}
