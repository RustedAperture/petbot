import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { createClient, type Client } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";

const root = resolve(import.meta.dirname, "../..");

export type TestDb = {
  db: ReturnType<typeof drizzle>;
  client: Client;
  cleanup: () => void;
};

/**
 * Builds a real SQLite database from src/db/schema.ts with `drizzle-kit push`.
 * The migration chain can't be replayed on a blank DB because the baseline
 * migration is commented out.
 */
export async function createTestDb(): Promise<TestDb> {
  const dir = mkdtempSync(join(tmpdir(), "petbot-test-db-"));
  const url = `file:${join(dir, "test.sqlite")}`;
  execFileSync(
    join(root, "node_modules/.bin/drizzle-kit"),
    [
      "push",
      "--dialect=sqlite",
      `--schema=${join(root, "src/db/schema.ts")}`,
      `--url=${url}`,
      "--force",
    ],
    { cwd: root, stdio: "pipe" },
  );
  const client = createClient({ url });
  return {
    db: drizzle({ client }),
    client,
    cleanup: () => {
      client.close();
      rmSync(dir, { recursive: true, force: true });
    },
  };
}
