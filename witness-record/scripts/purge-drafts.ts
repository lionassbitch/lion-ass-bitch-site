import { scriptContext } from "./_context.js";
import { purgeExpiredDrafts } from "../server/src/services/retention.js";

/** Applies the draft retention policy once (for cron use). Signed statements are never touched. */
const { ctx, close } = await scriptContext();
const r = await purgeExpiredDrafts(ctx);
console.log(`drafts purged: ${r.draftsPurged}; files deleted: ${r.filesDeleted}; expired sessions removed: ${r.sessionsPurged}`);
await close();
