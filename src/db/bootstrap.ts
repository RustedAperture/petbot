/**
 * bootstrapDb
 *
 * Handles the case where a database was created outside of Drizzle (e.g. a
 * production SQLite file from the old Sequelize setup) and therefore has no
 * `__drizzle_migrations` tracking table.
 *
 * If the app tables already exist but the migrations table is empty we stamp
 * the initial on-disk migration as already applied so that `migrate()` becomes a
 * no-op and does not attempt to re-run DDL statements against a live schema.
 */

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { sql } from "drizzle-orm";
import { client, drizzleDb } from "./connector.js";

const MIGRATIONS_FOLDER = "./drizzle";
const MIGRATIONS_TABLE = "__drizzle_migrations";

/** Returns true when the named table exists in the SQLite database. */
async function tableExists(tableName: string): Promise<boolean> {
  const result = await client.execute({
    sql: "SELECT name FROM sqlite_master WHERE type='table' AND name=?",
    args: [tableName],
  });
  return result.rows.length > 0;
}

/**
 * Reads all migration files from the drizzle folder (same algorithm as
 * drizzle-orm's `readMigrationFiles`) and returns their hashes + timestamps.
 */
function readMigrations(): Array<{ hash: string; folderMillis: number }> {
  const entries = fs
    .readdirSync(MIGRATIONS_FOLDER)
    .map((subdir) => ({
      sqlPath: path.join(MIGRATIONS_FOLDER, subdir, "migration.sql"),
      name: subdir,
    }))
    .filter((it) => fs.existsSync(it.sqlPath))
    .sort((a, b) => a.name.localeCompare(b.name));

  return entries.map(({ sqlPath, name }) => {
    const content = fs.readFileSync(sqlPath).toString();
    const hash = crypto.createHash("sha256").update(content).digest("hex");

    // Folder names are prefixed with a 14-digit UTC timestamp: YYYYMMDDHHmmss
    const datePart = name.slice(0, 14);
    const year = parseInt(datePart.slice(0, 4), 10);
    const month = parseInt(datePart.slice(4, 6), 10) - 1;
    const day = parseInt(datePart.slice(6, 8), 10);
    const hour = parseInt(datePart.slice(8, 10), 10);
    const minute = parseInt(datePart.slice(10, 12), 10);
    const second = parseInt(datePart.slice(12, 14), 10);
    const folderMillis = Date.UTC(year, month, day, hour, minute, second);

    return { hash, folderMillis };
  });
}

/**
 * Call this before `migrate()`.
 *
 * Detects a "legacy" database (app tables present, migrations table absent or
 * empty) and stamps all known migrations as applied so drizzle skips them.
 */
export async function bootstrapDb(): Promise<void> {
  // Ensure the tracking table exists (drizzle's migrate() does this too, but
  // we need it here to safely query it).
  await drizzleDb.run(
    sql.raw(`
    CREATE TABLE IF NOT EXISTS ${MIGRATIONS_TABLE} (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      hash TEXT NOT NULL,
      created_at NUMERIC
    )
  `),
  );

  // Check whether any migrations have already been recorded.
  const existingResult = await client.execute(
    `SELECT COUNT(*) as cnt FROM ${MIGRATIONS_TABLE}`,
  );
  const count = Number(existingResult.rows[0]?.cnt ?? 0);

  if (count > 0) {
    // DB is already managed by drizzle — nothing to do.
    return;
  }

  // Migrations table is empty. Check if the app tables already exist
  // (indicating a pre-Drizzle / copied production database).
  const appTableExists = await tableExists("actionData");
  if (!appTableExists) {
    // Fresh database — let drizzle run all migrations normally.
    return;
  }

  // Legacy / copied prod DB: stamp only the initial migration as applied so
  // that migrate() skips the schema creation but still runs the subsequent
  // migrations (type changes, timestamp normalisation, etc.).
  const migrations = readMigrations();
  const initial = migrations[0];
  if (!initial) {
    return;
  }

  await client.execute({
    sql: `INSERT INTO ${MIGRATIONS_TABLE} (hash, created_at) VALUES (?, ?)`,
    args: [initial.hash, initial.folderMillis],
  });

  console.log(
    "[bootstrap] Stamped initial migration on existing database — subsequent migrations will still run.",
  );
}
