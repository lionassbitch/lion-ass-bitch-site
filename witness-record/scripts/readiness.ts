import { scriptContext } from "./_context.js";
import { readinessReport } from "../server/src/services/readiness.js";

const { ctx, close } = await scriptContext();
const report = await readinessReport(ctx);
console.log(`THE WITNESS RECORD — readiness checklist (${report.generatedAt})\n`);
for (const w of report.warnings) console.log(`! ${w}`);
if (report.warnings.length) console.log("");
const pad = (s: string, n: number) => (s + " ".repeat(n)).slice(0, n);
for (const i of report.items) console.log(`${pad(i.status, 16)} ${pad(i.label, 52)} ${i.detail}${i.doc ? `  [${i.doc}]` : ""}`);
const blocking = report.items.filter((i) => i.status === "FAILED" || i.status === "NOT CONFIGURED");
console.log(`\n${blocking.length === 0 ? "No blocking items." : `${blocking.length} item(s) need attention before launch.`}`);
await close();
process.exit(blocking.length ? 1 : 0);
