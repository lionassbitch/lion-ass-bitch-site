import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { startTestApp, completeDraft, signStatement, uploadFile } from "../helpers/app.js";
import { purgeExpiredDrafts } from "../../server/src/services/retention.js";

describe("retention policy", () => {
  it("purges stale unsigned drafts and their files but never signed statements", async () => {
    const t = await startTestApp({ REQUIRE_INVITE_LINK: "false", DRAFT_RETENTION_DAYS: "30" });
    try {
      const mp4 = fs.readFileSync(path.resolve(import.meta.dirname, "../fixtures/sample.mp4"));
      const a = await t.login({ sub: "a", email: "a@example.test", name: "A" });
      const staleDraft = await completeDraft(t, a);
      const up = await uploadFile(t, a, staleDraft, mp4, { kind: "video", sourceType: "uploaded_file", filename: "v.mp4", mime: "video/mp4" });
      const b = await t.login({ sub: "b", email: "b@example.test", name: "B" });
      const signedId = await completeDraft(t, b);
      await uploadFile(t, b, signedId, mp4, { kind: "video", sourceType: "uploaded_file", filename: "v.mp4", mime: "video/mp4" });
      expect((await signStatement(t, b, signedId, "typed")).res.status).toBe(200);
      const c = await t.login({ sub: "c", email: "c@example.test", name: "C" });
      const freshDraft = await completeDraft(t, c);
      // Age the stale draft and the signed statement beyond the window.
      // The protection trigger stamps updated_at on every change, so aging a row for the test requires bypassing it.
      await t.ctx.dbHandle.exec("ALTER TABLE witness_statements DISABLE TRIGGER witness_statements_protect");
      await t.ctx.dbHandle.exec("UPDATE witness_statements SET updated_at = now() - interval '60 days' WHERE id = $1", [staleDraft]);
      await t.ctx.dbHandle.exec("ALTER TABLE witness_statements ENABLE TRIGGER witness_statements_protect");
      const before = await t.ctx.dbHandle.exec("SELECT count(*)::int AS n FROM witness_statements WHERE status = 'signed'");
      const r = await purgeExpiredDrafts(t.ctx);
      expect(r.draftsPurged).toBe(1);
      expect(r.filesDeleted).toBe(1);
      const rows = await t.ctx.dbHandle.exec("SELECT id, status FROM witness_statements");
      const byId = Object.fromEntries(rows.rows.map((x) => [x.id, x.status]));
      expect(byId[staleDraft]).toBe("abandoned");
      expect(byId[freshDraft]).toBe("draft");
      expect(byId[signedId]).toBe("signed");
      expect((await t.ctx.dbHandle.exec("SELECT count(*)::int AS n FROM witness_statements WHERE status = 'signed'")).rows[0].n).toBe(before.rows[0].n);
      expect(fs.existsSync(path.join(t.storageDir, `statements/${staleDraft}/video/${up.mediaAssetId}`))).toBe(false);
      const signedMedia = await t.ctx.dbHandle.exec("SELECT storage_key FROM media_assets WHERE statement_id = $1 AND kind = 'video'", [signedId]);
      expect(fs.existsSync(path.join(t.storageDir, String(signedMedia.rows[0].storage_key)))).toBe(true);
      const audit = await t.ctx.dbHandle.exec("SELECT action FROM audit_events WHERE action = 'retention.draft_purged'");
      expect(audit.rows.length).toBe(1);
    } finally {
      await t.close();
    }
  });
});
