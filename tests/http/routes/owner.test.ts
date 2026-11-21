import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import supertest from "supertest";
import type { TestDb } from "../../helpers/testDb.js";
import { customActionBans, customActions } from "../../../src/db/schema.js";

const { testDb, syncMock } = vi.hoisted(() => ({
  testDb: { current: null as unknown as TestDb },
  syncMock: vi.fn(),
}));

vi.mock("../../../src/db/connector.js", async () => {
  const { createTestDb } = await import("../../helpers/testDb.js");
  testDb.current = await createTestDb();
  return { drizzleDb: testDb.current.db, default: testDb.current.db };
});
vi.mock("../../../src/logger.js", () => ({
  default: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));
vi.mock("../../../src/utilities/customActions/guildCommandSync.js", () => ({
  syncGuildCommands: syncMock,
}));

import { createApp } from "../../../src/http/expressServer.js";

const client = {} as any;
const row = (over: Record<string, unknown>) => ({
  name: "boop",
  phrase: "booped",
  scope: "user" as const,
  ownerId: "u1",
  image: null,
  createdBy: "u1",
  createdAt: "2026-01-01",
  updatedAt: "2026-01-01",
  ...over,
});

afterAll(() => testDb.current.cleanup());

let app: ReturnType<typeof createApp>;

beforeEach(async () => {
  vi.clearAllMocks();
  delete process.env.INTERNAL_API_SECRET;
  syncMock.mockResolvedValue(true);
  await testDb.current.db.delete(customActions);
  await testDb.current.db.delete(customActionBans);
  app = createApp(client);
});

describe("owner routes", () => {
  it("lists actions with name, scope and ownerId filters", async () => {
    await testDb.current.db.insert(customActions).values([
      row({ name: "boop" }),
      row({ name: "zap", ownerId: "u2" }),
      row({ name: "boop", scope: "guild", ownerId: "111" }),
    ]);
    const all = await supertest(app).get("/api/owner/customActions").expect(200);
    expect(all.body.actions).toHaveLength(3);
    const filtered = await supertest(app)
      .get("/api/owner/customActions?name=boop&scope=guild&ownerId=111")
      .expect(200);
    expect(filtered.body.actions).toHaveLength(1);
    expect(filtered.body.actions[0].ownerId).toBe("111");
  });

  it.each([
    "scope=bad",
    "scope=user&scope=guild",
    "name=a&name=b",
    "ownerId=abc",
    "ownerId=1&ownerId=2",
  ])("rejects malformed filter %s", async (query) => {
    await supertest(app)
      .get(`/api/owner/customActions?${query}`)
      .expect(400, { error: "invalid_filter" });
  });

  it("deleting a guild action syncs that guild", async () => {
    const [inserted] = await testDb.current.db
      .insert(customActions)
      .values(row({ scope: "guild", ownerId: "111" }))
      .returning();
    await supertest(app).delete(`/api/owner/customActions/${inserted.id}`).expect(200, { ok: true });
    expect(syncMock).toHaveBeenCalledWith(client, "111");
  });

  it("does not wait for a sync that never resolves", async () => {
    syncMock.mockReturnValue(new Promise(() => {}));
    const [inserted] = await testDb.current.db
      .insert(customActions)
      .values(row({ scope: "guild", ownerId: "111" }))
      .returning();
    await supertest(app).delete(`/api/owner/customActions/${inserted.id}`).expect(200, { ok: true });
  });

  it("deleting a user action does not sync", async () => {
    const [inserted] = await testDb.current.db.insert(customActions).values(row({})).returning();
    await supertest(app).delete(`/api/owner/customActions/${inserted.id}`).expect(200);
    expect(syncMock).not.toHaveBeenCalled();
  });

  it.each(["999", "abc"])("deleting id %s returns 404", async (id) => {
    await supertest(app).delete(`/api/owner/customActions/${id}`).expect(404, { error: "not_found" });
  });

  it("bans, lists and unbans a creator", async () => {
    await supertest(app).put("/api/owner/bans/u1").expect(200, { ok: true });
    const list = await supertest(app).get("/api/owner/bans").expect(200);
    expect(list.body.bans.map((b: { userId: string }) => b.userId)).toEqual(["u1"]);
    await supertest(app).delete("/api/owner/bans/u1").expect(200, { ok: true });
    const after = await supertest(app).get("/api/owner/bans").expect(200);
    expect(after.body.bans).toEqual([]);
  });
});
