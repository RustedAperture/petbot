import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";

const sqlitePath = process.env.SQLITE_PATH || "data/database.sqlite";
const libsqlUrl = process.env.LIBSQL_URL ?? `file:${sqlitePath}`;
export const client = createClient({ url: libsqlUrl });
export const drizzleDb = drizzle({ client });
export default drizzleDb;
