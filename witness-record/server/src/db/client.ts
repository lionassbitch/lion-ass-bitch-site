import { drizzle as drizzlePg, type NodePgDatabase } from "drizzle-orm/node-postgres";
import pg from "pg";
import { schema } from "./schema.js";

export type Db = NodePgDatabase<typeof schema>;

export interface DbHandle {
  db: Db;
  /** Execute raw SQL (used by the migration runner). */
  exec: (sql: string, params?: unknown[]) => Promise<{ rows: Record<string, unknown>[] }>;
  close: () => Promise<void>;
  kind: "postgres" | "pglite";
}

/**
 * Creates the database handle.
 *
 * Production: PostgreSQL via DATABASE_URL (TLS recommended; DATABASE_SSL=require).
 * Tests/development without a server: DATABASE_URL=pglite://<directory> or
 * pglite://memory runs an embedded PostgreSQL (same SQL, same triggers). The
 * embedded engine is refused when NODE_ENV=production.
 */
export async function createDb(databaseUrl: string, opts: { ssl?: string; sslCa?: string; isProd?: boolean } = {}): Promise<DbHandle> {
  if (!databaseUrl) throw new Error("DATABASE_URL is not set.");
  if (databaseUrl.startsWith("pglite://")) {
    if (opts.isProd) throw new Error("The embedded pglite database is not permitted in production.");
    const { PGlite } = await import("@electric-sql/pglite");
    const { drizzle: drizzlePglite } = await import("drizzle-orm/pglite");
    const target = databaseUrl.slice("pglite://".length);
    const client = target === "memory" || target === "" ? new PGlite() : new PGlite(target);
    await client.waitReady;
    const db = drizzlePglite(client, { schema }) as unknown as Db;
    return {
      db,
      kind: "pglite",
      exec: async (sql, params) => {
        // The extended protocol cannot run multi-statement scripts (migrations); use simple-query mode when unparameterized.
        if (!params || params.length === 0) {
          const results = await client.exec(sql);
          const last = results.at(-1);
          return { rows: (last?.rows ?? []) as Record<string, unknown>[] };
        }
        const r = await client.query(sql, params as unknown[]);
        return { rows: r.rows as Record<string, unknown>[] };
      },
      close: () => client.close(),
    };
  }
  const ca = opts.sslCa ? opts.sslCa.replace(/\\n/g, "\n") : undefined;
  const ssl = opts.ssl === "require" ? { rejectUnauthorized: true, ca } : opts.ssl === "no-verify" ? { rejectUnauthorized: false } : undefined;
  const pool = new pg.Pool({ connectionString: databaseUrl, ssl, max: 10 });
  const db = drizzlePg(pool, { schema });
  return {
    db,
    kind: "postgres",
    exec: async (sql, params) => {
      const r = await pool.query(sql, params as unknown[]);
      return { rows: r.rows as Record<string, unknown>[] };
    },
    close: () => pool.end(),
  };
}
