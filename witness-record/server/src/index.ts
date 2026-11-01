import { loadConfig } from "./config.js";
import { createDb } from "./db/client.js";
import { runMigrations } from "./db/migrate.js";
import { createStorage } from "./storage/index.js";
import { AuditService } from "./services/audit.js";
import { MalwareScanner } from "./services/scanner.js";
import { OidcService } from "./auth/oidc.js";
import { buildApp } from "./app.js";
import { scheduleRetentionJob } from "./services/retention.js";
import type { AppContext } from "./context.js";
import pino from "pino";

/** Composes the application context and starts the HTTP server. */
export async function createContext(env: NodeJS.ProcessEnv = process.env): Promise<AppContext> {
  const cfg = loadConfig(env);
  const log = pino({ level: cfg.env.LOG_LEVEL, redact: { paths: ["req.headers.cookie", "req.headers.authorization", "res.headers['set-cookie']"], censor: "[redacted]" } });
  for (const w of cfg.warnings) log.warn(w);
  const dbHandle = await createDb(cfg.env.DATABASE_URL, { ssl: cfg.env.DATABASE_SSL, isProd: cfg.isProd });
  const applied = await runMigrations(dbHandle, (m) => log.info(m));
  if (applied.length) log.info({ applied }, "migrations applied");
  const storage = createStorage(cfg);
  const ctx: AppContext = {
    cfg,
    dbHandle,
    db: dbHandle.db,
    storage,
    audit: new AuditService(dbHandle.db),
    scanner: new MalwareScanner(cfg.env.CLAMAV_HOST, cfg.env.CLAMAV_PORT),
    oidc: new OidcService(cfg),
    log,
    startedAt: new Date(),
  };
  return ctx;
}

async function main() {
  const ctx = await createContext();
  const app = await buildApp(ctx);
  await app.listen({ port: ctx.cfg.env.PORT, host: ctx.cfg.env.HOST });
  if (ctx.cfg.env.RETENTION_JOB_ENABLED) scheduleRetentionJob(ctx);
  app.log.info(`THE WITNESS RECORD listening on ${ctx.cfg.env.HOST}:${ctx.cfg.env.PORT} (${ctx.cfg.baseUrl.origin})`);
  const shutdown = async () => {
    app.log.info("shutting down");
    await app.close();
    await ctx.dbHandle.close();
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

const isDirectRun = process.argv[1] && (process.argv[1].endsWith("/server/src/index.ts") || process.argv[1].endsWith("/dist/server/index.js"));
if (isDirectRun) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
