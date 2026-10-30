import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createDb, type DbHandle } from "./client.js";

const here = path.dirname(fileURLToPath(import.meta.url));

export function migrationsDir(): string {
  // dist/server/db -> ../../../migrations ; server/src/db -> ../../../migrations
  const candidates = [path.resolve(here, "../../../migrations"), path.resolve(process.cwd(), "migrations")];
  for (const c of candidates) if (fs.existsSync(c)) return c;
  throw new Error("migrations directory not found");
}

/** Applies every migrations/*.sql file not yet recorded, in filename order, each inside a transaction. */
export async function runMigrations(handle: DbHandle, log: (m: string) => void = () => {}): Promise<string[]> {
  await handle.exec(`CREATE TABLE IF NOT EXISTS schema_migrations (
    name text PRIMARY KEY,
    applied_at timestamptz NOT NULL DEFAULT now(),
    sha256 text NOT NULL
  )`);
  const dir = migrationsDir();
  const files = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".sql"))
    .sort();
  const applied = new Set((await handle.exec("SELECT name FROM schema_migrations")).rows.map((r) => r.name as string));
  const done: string[] = [];
  const { createHash } = await import("node:crypto");
  for (const file of files) {
    if (applied.has(file)) continue;
    const sql = fs.readFileSync(path.join(dir, file), "utf8");
    const digest = createHash("sha256").update(sql).digest("hex");
    log(`applying ${file}`);
    await handle.exec("BEGIN");
    try {
      await handle.exec(sql);
      await handle.exec("INSERT INTO schema_migrations (name, sha256) VALUES ($1, $2)", [file, digest]);
      await handle.exec("COMMIT");
    } catch (err) {
      await handle.exec("ROLLBACK");
      throw err;
    }
    done.push(file);
  }
  return done;
}

const isDirectRun = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isDirectRun) {
  const { loadConfig } = await import("../config.js");
  const cfg = loadConfig();
  const handle = await createDb(cfg.env.DATABASE_URL, { ssl: cfg.env.DATABASE_SSL, isProd: cfg.isProd });
  const done = await runMigrations(handle, (m) => console.log(m));
  console.log(done.length ? `applied: ${done.join(", ")}` : "database is up to date");
  await handle.close();
}
