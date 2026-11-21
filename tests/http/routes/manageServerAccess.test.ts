import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import supertest from "supertest";
import { PermissionsBitField } from "discord.js";
import type { TestDb } from "../../helpers/testDb.js";
import { botData } from "../../../src/db/schema.js";

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

function appFor(permissions: bigint) {
  const guild = {
    ownerId: "owner",
    channels: {
      fetch: async () => new Map([["c1", { id: "c1", name: "general", type: 0 }]]),
    },
    members: {
      fetch: async () => ({ permissions: new PermissionsBitField(permissions) }),
    },
  };
  return createApp({ guilds: { fetch: async () => guild } } as any);
}

beforeEach(async () => {
  delete process.env.INTERNAL_API_SECRET;
  await testDb.current.db.delete(botData);
  await testDb.current.db.insert(botData).values({
    guildId: "g1",
    nickname: "PetBot",
    restricted: false,
    createdAt: NOW,
    updatedAt: NOW,
  });
});

describe("server settings access", () => {
  it("lets a Manage Server only member read and update settings and list channels", async () => {
    const app = appFor(PermissionsBitField.Flags.ManageGuild);

    await supertest(app).get("/api/serverSettings/g1/userId/u1").expect(200);
    await supertest(app)
      .patch("/api/serverSettings/g1/userId/u1")
      .send({ nickname: "Pet" })
      .expect(200);
    const channels = await supertest(app).get("/api/guildChannels/g1/user/u1").expect(200);
    expect(channels.body).toEqual({ channels: [{ id: "c1", name: "general" }] });
  });

  it("refuses a member without Manage Server", async () => {
    const app = appFor(PermissionsBitField.Flags.SendMessages);

    await supertest(app).get("/api/serverSettings/g1/userId/u1").expect(403);
    await supertest(app)
      .patch("/api/serverSettings/g1/userId/u1")
      .send({ nickname: "Pet" })
      .expect(403);
    await supertest(app).get("/api/guildChannels/g1/user/u1").expect(403);
  });
});
