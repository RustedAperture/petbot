import { describe, it, expect, vi } from "vitest";

// Mock @libsql/client
vi.mock("@libsql/client", () => ({
  createClient: () => ({
    // minimal shape used by these tests / drizzle initialization
    execute: async () => ({ rows: [], columns: [] }),
    request: async () => ({ rows: [], columns: [] }),
  }),
}));

import { drizzleDb, client } from "../../src/db/connector.js";
import { actionData, botData, userSessions } from "../../src/db/schema.js";

describe("db exports (drizzle)", () => {
  it("exports drizzle instance and table schemas", () => {
    expect(drizzleDb).toBeDefined();
    expect(actionData).toBeDefined();
    expect(botData).toBeDefined();
    expect(userSessions).toBeDefined();
    expect(client).toBeDefined();
  });
});
