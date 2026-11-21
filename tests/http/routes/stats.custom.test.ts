import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import supertest from "supertest";
import type { TestDb } from "../../helpers/testDb.js";
import { actionData, customActions } from "../../../src/db/schema.js";

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

const now = "2026-01-01";
const action = (over: Record<string, unknown>) => ({
  name: "boop",
  phrase: "booped",
  scope: "guild" as const,
  ownerId: "g1",
  image: "https://example.com/guild.png",
  createdBy: "u1",
  createdAt: now,
  updatedAt: now,
  ...over,
});
const rowFor = (userId: string, locationId: string, actionType: string, hasPerformed: number) => ({
  userId,
  locationId,
  actionType,
  hasPerformed,
  hasReceived: 0,
  images: [],
  createdAt: now,
  updatedAt: now,
});

afterAll(() => testDb.current.cleanup());

let app: ReturnType<typeof createApp>;

beforeEach(async () => {
  delete process.env.INTERNAL_API_SECRET;
  await testDb.current.db.delete(actionData);
  await testDb.current.db.delete(customActions);
  await testDb.current.db.insert(customActions).values([
    action({}),
    action({ name: "zap", scope: "user", ownerId: "u1", image: null }),
  ]);
  await testDb.current.db.insert(actionData).values([
    rowFor("u1", "g1", "boop", 3),
    rowFor("u1", "g1", "zap", 2),
    rowFor("u1", "g1", "pet", 1),
  ]);
  app = createApp();
});

describe("custom actions in /api/stats", () => {
  it("global stats stay built-ins only", async () => {
    const res = await supertest(app).get("/api/stats").expect(200);
    expect(Object.keys(res.body.totalsByAction)).toEqual(["pet", "bite", "hug", "bonk", "squish", "explode"]);
  });

  it("guild stats add the guild's actions with the definition image", async () => {
    const res = await supertest(app).get("/api/stats/guild/g1").expect(200);
    expect(res.body.totalsByAction.boop).toMatchObject({
      totalHasPerformed: 3,
      imageUrl: "https://example.com/guild.png",
    });
    expect(res.body.totalsByAction.zap).toBeUndefined();
  });

  it("user and location stats add the custom names the user has rows for", async () => {
    const res = await supertest(app).get("/api/stats/user/u1/guild/g1").expect(200);
    expect(res.body.totalsByAction.boop.imageUrl).toBe("https://example.com/guild.png");
    expect(res.body.totalsByAction.zap).toMatchObject({ totalHasPerformed: 2, imageUrl: null });
    expect(res.body.totalsByAction.pet.totalHasPerformed).toBe(1);
  });

  it("custom-only activity elsewhere does not change the global headline numbers", async () => {
    const before = (await supertest(app).get("/api/stats").expect(200)).body;
    await testDb.current.db.insert(actionData).values(rowFor("u7", "g7", "boop", 9));
    const after = (await supertest(app).get("/api/stats").expect(200)).body;
    expect(after.totalUniqueUsers).toBe(before.totalUniqueUsers);
    expect(after.totalLocations).toBe(before.totalLocations);
  });

  it("guild headline counts ignore performers whose rows are personal or removed actions", async () => {
    await testDb.current.db.insert(actionData).values([
      rowFor("u2", "g1", "zap", 4),
      rowFor("u3", "g1", "gone", 4),
    ]);
    const res = await supertest(app).get("/api/stats/guild/g1").expect(200);
    expect(res.body.totalUniqueUsers).toBe(1);
  });

  it("a guild with only personal rows reports no locations", async () => {
    await testDb.current.db.insert(actionData).values(rowFor("u2", "g5", "zap", 4));
    const res = await supertest(app).get("/api/stats/guild/g5").expect(200);
    expect(res.body.totalLocations).toBe(0);
  });

  it("a new guild action named constructor shows zero counts", async () => {
    await testDb.current.db
      .insert(customActions)
      .values(action({ name: "constructor", image: null }));
    const res = await supertest(app).get("/api/stats/guild/g1").expect(200);
    expect(res.body.totalsByAction.constructor).toMatchObject({
      totalHasPerformed: 0,
      totalHasReceived: 0,
      totalUsers: 0,
    });
  });

  it("user stats scope custom names to rows the user has", async () => {
    const res = await supertest(app).get("/api/stats/user/u2").expect(200);
    expect(Object.keys(res.body.totalsByAction)).toHaveLength(6);
  });
});
