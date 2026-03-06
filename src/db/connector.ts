import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import fs from "fs";
import path from "path";

// allow tests to avoid touching the on-disk sqlite file
const isTest = process.env.NODE_ENV === "test";

let libsqlUrl: string;
if (isTest) {
  // use shared in-memory database during testing to prevent file system issues
  libsqlUrl = process.env.LIBSQL_URL || "file::memory:?cache=shared";
} else {
  const sqlitePath = process.env.SQLITE_PATH || "data/database.sqlite";
  libsqlUrl = process.env.LIBSQL_URL ?? `file:${sqlitePath}`;
  // ensure directory exists when using disk path
  try {
    const dir = sqlitePath.includes(path.sep) ? path.dirname(sqlitePath) : null;
    if (dir) {
      fs.mkdirSync(dir, { recursive: true });
    }
  } catch {
    // ignore errors creating dir
  }
}

export const client = createClient({ url: libsqlUrl });
export const drizzleDb = drizzle({ client });
export default drizzleDb;
