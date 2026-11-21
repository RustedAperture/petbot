import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import supertest from "supertest";
import type { TestDb } from "../../helpers/testDb.js";
import { botData, customActions } from "../../../src/db/schema.js";

const { testDb } = vi.hoisted(() => ({
  testDb: { current: null as unknown as TestDb },
}));

vi.mock("../../../src/db/connector.js", async () => {
  const { createTestDb } = await import("../../helpers/testDb.js");
  testDb.current = await createTestDb();
  return { drizzleDb: testDb.current.db, default: testDb.current.db };
});
vi.mock("../../../src/logger.js", () => ({
  default: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

import { createApp } from "../../../src/http/expressServer.js";

afterAll(() => testDb.current.cleanup());

const NOW = "2026-01-01T00:00:00.000Z";

function clientWith(isReady: boolean) {
  return {
    isReady: () => isReady,
    guilds: { cache: new Map([["g1", {}]]) },
  } as any;
}

const ask = (guildId: string, isReady = true) =>
  supertest(createApp(clientWith(isReady))).get(`/api/guilds/bot/${guildId}`);

beforeEach(async () => {
  delete process.env.INTERNAL_API_SECRET;
  await testDb.current.db.delete(customActions);
  await testDb.current.db.delete(botData);
});

describe("GET /api/guilds/bot/:guildId", () => {
  it("is true for a guild in the cache and false for an unknown id", async () => {
    expect((await ask("g1").expect(200)).body).toEqual({
      isBotGuild: true,
      isBotMember: true,
    });
    expect((await ask("dm-1").expect(200)).body).toEqual({
      isBotGuild: false,
      isBotMember: false,
    });
  });

  it("stays true after the bot left while custom actions remain", async () => {
    await testDb.current.db.insert(customActions).values({
      name: "boop",
      phrase: "booped",
      scope: "guild",
      ownerId: "gone",
      image: null,
      createdBy: null,
      createdAt: NOW,
      updatedAt: NOW,
    });
    expect((await ask("gone").expect(200)).body).toEqual({
      isBotGuild: true,
      isBotMember: false,
    });
  });

  it("stays true after the bot left while a botData row remains", async () => {
    await testDb.current.db.insert(botData).values({
      guildId: "gone",
      restricted: false,
      createdAt: NOW,
      updatedAt: NOW,
    });
    expect((await ask("gone").expect(200)).body).toEqual({
      isBotGuild: true,
      isBotMember: false,
    });
  });

  it("answers 503 before the client is ready", async () => {
    await ask("g1", false).expect(503);
  });
});
