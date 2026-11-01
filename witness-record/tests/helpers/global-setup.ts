/**
 * Vitest global setup. Decides which database backend the suite uses:
 *  - TEST_DATABASE_URL (admin connection to a PostgreSQL server): each test
 *    file creates and drops its own database. This is what CI should use.
 *  - otherwise: embedded pglite (same SQL and triggers) in a temp directory.
 */
export default async function setup() {
  const url = process.env.TEST_DATABASE_URL;
  if (url) {
    const pg = await import("pg");
    const client = new pg.default.Client({ connectionString: url });
    await client.connect();
    const r = await client.query("select version()");
    console.log(`[tests] PostgreSQL: ${String(r.rows[0].version).split(",")[0]}`);
    await client.end();
  } else {
    console.log("[tests] TEST_DATABASE_URL not set; using embedded pglite");
  }
}
