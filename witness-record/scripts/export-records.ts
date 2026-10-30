import fs from "node:fs";
import path from "node:path";
import { scriptContext } from "./_context.js";
import { BundleService } from "../server/src/services/bundle.js";
import { witnessStatements } from "../server/src/db/schema.js";

/**
 * Exports every statement as an individual evidence package (ZIP) plus a
 * metadata index, without going through the web dashboard. Usage:
 *   npm run export:records -- ./exports
 */
const outDir = path.resolve(process.argv[2] ?? "./exports");
fs.mkdirSync(outDir, { recursive: true });
const { ctx, close } = await scriptContext();
const bundles = new BundleService(ctx);
const rows = await ctx.db.select().from(witnessStatements).orderBy(witnessStatements.createdAt);
const index: unknown[] = [];
for (const st of rows) {
  const file = path.join(outDir, `evidence-${st.evidenceId}.zip`);
  const stream = await bundles.zipStream(st);
  await new Promise<void>((resolve, reject) => {
    const w = fs.createWriteStream(file);
    stream.pipe(w);
    w.on("finish", resolve);
    w.on("error", reject);
    stream.on("error", reject);
  });
  const { manifest } = await bundles.buildManifestAndSummary(st);
  index.push(manifest);
  console.log(`wrote ${file}`);
  await ctx.audit.record({ actorType: "system", statementId: st.id, action: "export.script_bundle", detail: { file: path.basename(file) } });
}
fs.writeFileSync(path.join(outDir, "index.json"), JSON.stringify({ generatedAtUtc: new Date().toISOString(), statements: index }, null, 2));
console.log(`exported ${rows.length} statement(s) to ${outDir}`);
await close();
