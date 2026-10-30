import { and, eq, inArray, lt } from "drizzle-orm";
import type { AppContext } from "../context.js";
import { mediaAssets, sessions, uploadSessions, witnessStatements } from "../db/schema.js";

/**
 * Retention policy (docs/RETENTION.md):
 *  - Unsigned drafts and abandoned statements older than DRAFT_RETENTION_DAYS
 *    are purged: their uploaded bytes are deleted and the rows are marked
 *    abandoned / removed. The audit trail (with hashes) is kept.
 *  - Signed statements are never purged automatically. Deletion of a signed
 *    statement is a documented manual process subject to any legal hold.
 *  - Expired sessions and stale upload sessions are cleaned.
 */
export async function purgeExpiredDrafts(ctx: AppContext, now = new Date()): Promise<{ draftsPurged: number; filesDeleted: number; sessionsPurged: number }> {
  const cutoff = new Date(now.getTime() - ctx.cfg.env.DRAFT_RETENTION_DAYS * 86_400_000);
  const stale = await ctx.db
    .select()
    .from(witnessStatements)
    .where(and(inArray(witnessStatements.status, ["draft", "abandoned"]), lt(witnessStatements.updatedAt, cutoff)));
  let filesDeleted = 0;
  for (const st of stale) {
    const media = await ctx.db.select().from(mediaAssets).where(and(eq(mediaAssets.statementId, st.id), inArray(mediaAssets.status, ["complete", "uploading"])));
    for (const m of media) {
      const [up] = await ctx.db.select().from(uploadSessions).where(eq(uploadSessions.mediaAssetId, m.id)).limit(1);
      if (up?.storageUploadRef && up.status === "open") await ctx.storage.abortResumable(up.storageUploadRef).catch(() => {});
      await ctx.storage.deleteObject(m.storageKey).catch(() => {});
      await ctx.db.update(mediaAssets).set({ status: "removed_before_signing", scanDetail: "purged by retention policy" }).where(eq(mediaAssets.id, m.id));
      filesDeleted++;
    }
    if (st.status === "draft") await ctx.db.update(witnessStatements).set({ status: "abandoned" }).where(eq(witnessStatements.id, st.id));
    await ctx.audit.record({ actorType: "system", statementId: st.id, action: "retention.draft_purged", detail: { evidenceId: st.evidenceId, previousStatus: st.status, cutoff: cutoff.toISOString(), filesDeleted: media.length } });
  }
  const expiredSessions = await ctx.db.delete(sessions).where(lt(sessions.expiresAt, new Date(now.getTime() - 30 * 86_400_000))).returning({ id: sessions.id });
  return { draftsPurged: stale.length, filesDeleted, sessionsPurged: expiredSessions.length };
}

export function scheduleRetentionJob(ctx: AppContext): NodeJS.Timeout {
  const run = () =>
    purgeExpiredDrafts(ctx)
      .then((r) => ctx.log.info(r, "retention job completed"))
      .catch((err) => ctx.log.error({ err }, "retention job failed"));
  const timer = setInterval(run, 24 * 3600 * 1000);
  timer.unref();
  setTimeout(run, 60_000).unref();
  return timer;
}
