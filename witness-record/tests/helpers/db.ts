import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

export interface TestDatabase {
  url: string;
  drop: () => Promise<void>;
}

export async function createTestDatabase(): Promise<TestDatabase> {
  const admin = process.env.TEST_DATABASE_URL;
  if (admin) {
    const pg = await import("pg");
    const name = `wr_test_${crypto.randomBytes(5).toString("hex")}`;
    const client = new pg.default.Client({ connectionString: admin });
    await client.connect();
    await client.query(`CREATE DATABASE ${name}`);
    await client.end();
    const u = new URL(admin);
    u.pathname = `/${name}`;
    return {
      url: u.toString(),
      drop: async () => {
        const c = new pg.default.Client({ connectionString: admin });
        await c.connect();
        await c.query(`DROP DATABASE IF EXISTS ${name} WITH (FORCE)`);
        await c.end();
      },
    };
  }
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "wr-pglite-"));
  return { url: `pglite://${dir}`, drop: async () => fs.rmSync(dir, { recursive: true, force: true }) };
}
