import { createContext } from "../server/src/index.js";
import { buildApp } from "../server/src/app.js";

/** Shared bootstrap for operational scripts: loads .env (if present) and the application context. */
export async function scriptContext() {
  const fs = await import("node:fs");
  if (fs.existsSync(".env")) {
    for (const line of fs.readFileSync(".env", "utf8").split("\n")) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^"(.*)"$/, "$1");
    }
  }
  const ctx = await createContext(process.env);
  const app = await buildApp(ctx);
  return { ctx, app, close: async () => { await app.close(); await ctx.dbHandle.close(); } };
}
