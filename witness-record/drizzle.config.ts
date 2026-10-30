import type { Config } from "drizzle-kit";

export default {
  schema: "./server/src/db/schema.ts",
  out: "./migrations/drizzle",
  dialect: "postgresql",
  dbCredentials: { url: process.env.DATABASE_URL ?? "" },
} satisfies Config;
