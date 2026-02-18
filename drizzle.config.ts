import "dotenv/config";
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  out: "./drizzle",
  schema: "./src/db/schema.ts",
  dialect: "turso",
  dbCredentials: {
    url:
      process.env.LIBSQL_URL ||
      `file:${process.env.SQLITE_PATH || "data/database.sqlite"}`,
    authToken: process.env.LIBSQL_AUTH_TOKEN,
  },
});
