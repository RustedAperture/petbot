import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest";
import supertest from "supertest";
import { client, drizzleDb } from "../../../src/db/connector.js";
import { actionData, userSessions } from "../../../src/db/schema.js";

vi.mock("../../../src/logger.js", () => ({
  default: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

import { createApp } from "../../../src/http/expressServer.js";

const now = new Date().toISOString();

function sessionRow(userId: string, guildIds: string[]) {
  return {
    userId,
    // The login callback persists Discord's raw guild objects.
    guilds: guildIds.map((id) => ({ id, name: `Guild ${id}` })) as any,
    createdAt: now,
    updatedAt: now,
  };
}

function actionRow(userId: string, locationId: string) {
  return {
    userId,
    locationId,
    actionType: "pet",
    hasPerformed: 1,
    createdAt: now,
    updatedAt: now,
  };
}

describe("GET /api/guilds/member/:userId", () => {
  let app: ReturnType<typeof createApp>;

  beforeAll(async () => {
    // Only the columns the handler reads plus NOT NULLs; libsql's migrate()
    // batch fails on the shared in-memory test database.
    await client.executeMultiple(`
      CREATE TABLE IF NOT EXISTS userSessions (
        user_id TEXT PRIMARY KEY,
        guilds TEXT DEFAULT '[]',
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS actionData (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        location_id TEXT,
        action_type TEXT NOT NULL,
        has_performed INTEGER DEFAULT 0,
        has_received INTEGER DEFAULT 0,
        images TEXT DEFAULT '[]',
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL
      );
    `);
  });

  beforeEach(async () => {
    delete process.env.INTERNAL_API_SECRET;
    await drizzleDb.delete(actionData);
    await drizzleDb.delete(userSessions);
    app = createApp();
  });

  it("returns member guilds with activity from anyone, excluding non-member and inactive guilds", async () => {
    await drizzleDb
      .insert(userSessions)
      .values([
        sessionRow("me", ["mine-active-other", "mine-active-me", "mine-idle"]),
        sessionRow("someone", ["not-mine"]),
      ]);
    await drizzleDb
      .insert(actionData)
      .values([
        actionRow("someone", "mine-active-other"),
        actionRow("me", "mine-active-me"),
        actionRow("someone", "not-mine"),
      ]);

    const res = await supertest(app).get("/api/guilds/member/me").expect(200);

    expect([...res.body.guildIds].sort()).toEqual([
      "mine-active-me",
      "mine-active-other",
    ]);
  });

  it.each([
    ["no session row", []],
    ["a session with no guilds", [sessionRow("me", [])]],
  ])("returns no guilds for %s", async (_label, sessions) => {
    if (sessions.length > 0) {
      await drizzleDb.insert(userSessions).values(sessions);
    }
    await drizzleDb.insert(actionData).values(actionRow("someone", "g1"));

    const res = await supertest(app).get("/api/guilds/member/me").expect(200);

    expect(res.body).toEqual({ guildIds: [] });
  });
});
