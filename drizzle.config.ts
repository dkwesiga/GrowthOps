import { defineConfig } from "drizzle-kit";

// Migrations run DDL, which is unreliable over the transaction-mode pooler
// (pgbouncer, port 6543). Prefer the session-mode DIRECT_URL when available.
const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DIRECT_URL or DATABASE_URL is required to run drizzle commands");
}

export default defineConfig({
  schema: "./drizzle/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: connectionString,
  },
});
