import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import supertest from "supertest";
import type { TestDb } from "../../helpers/testDb.js";
import { customActionBans, customActions } from "../../../src/db/schema.js";

const { testDb, checkImageMock, syncMock, canManageMock } = vi.hoisted(() => ({
  testDb: { current: null as unknown as TestDb },
  checkImageMock: vi.fn(),
  syncMock: vi.fn(),
  canManageMock: vi.fn(),
}));

vi.mock("../../../src/db/connector.js", async () => {
  const { createTestDb } = await import("../../helpers/testDb.js");
  testDb.current = await createTestDb();
  return { drizzleDb: testDb.current.db, default: testDb.current.db };
});
vi.mock("../../../src/logger.js", () => ({
  default: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));
vi.mock("../../../src/utilities/check_image.js", () => ({
  checkImage: checkImageMock,
}));
vi.mock("../../../src/utilities/customActions/guildCommandSync.js", () => ({
  syncGuildCommands: syncMock,
}));
vi.mock("../../../src/utilities/helper.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../../src/utilities/helper.js")>()),
  canManageServerActions: canManageMock,
}));

import { createApp } from "../../../src/http/expressServer.js";

const client = { guilds: { cache: new Map([["g1", {}]]) } } as any;
const body = { name: "boop", phrase: "booped", image: "https://example.com/a.png" };

afterAll(() => testDb.current.cleanup());

let app: ReturnType<typeof createApp>;

beforeEach(async () => {
  vi.clearAllMocks();
  delete process.env.INTERNAL_API_SECRET;
  await testDb.current.db.delete(customActions);
  await testDb.current.db.delete(customActionBans);
  checkImageMock.mockResolvedValue(true);
  syncMock.mockResolvedValue(true);
  canManageMock.mockResolvedValue(true);
  app = createApp(client);
});

describe("user custom action routes", () => {
  it("PUT saves, GET lists and DELETE removes", async () => {
    const put = await supertest(app)
      .put("/api/customActions/user/u1")
      .send(body)
      .expect(200);
    expect(put.body.action).toMatchObject({
      name: "boop",
      phrase: "booped",
      scope: "user",
      ownerId: "u1",
      createdBy: "u1",
    });

    const list = await supertest(app).get("/api/customActions/user/u1").expect(200);
    expect(list.body.actions).toHaveLength(1);

    await supertest(app).delete("/api/customActions/user/u1/boop").expect(200, { ok: true });
    await supertest(app).delete("/api/customActions/user/u1/boop").expect(404, { error: "not_found" });
  });

  it.each([
    ["an invalid name", { name: "Bad1" }, "Names can only use lowercase letters a–z (1–20)."],
    ["a reserved name", { name: "pet" }, "That name is already a built-in action or command."],
    ["a bad phrase", { phrase: "@everyone" }, "Phrases can't contain mentions, links or formatting."],
    ["a missing image", { image: undefined }, "Your URL is invalid, please try again"],
  ])("rejects %s", async (_label, override, error) => {
    await supertest(app)
      .put("/api/customActions/user/u1")
      .send({ ...body, ...override })
      .expect(400, { error });
  });

  it("rejects an image that fails the check", async () => {
    checkImageMock.mockResolvedValue(false);
    await supertest(app)
      .put("/api/customActions/user/u1")
      .send(body)
      .expect(400, { error: "Your URL is invalid, please try again" });
  });

  it("enforces the limit of 5", async () => {
    for (const name of ["a", "b", "c", "d", "e"]) {
      await supertest(app).put("/api/customActions/user/u1").send({ ...body, name }).expect(200);
    }
    await supertest(app)
      .put("/api/customActions/user/u1")
      .send({ ...body, name: "f" })
      .expect(400, { error: "You've reached the limit of 5 custom actions." });
  });

  it("rejects a banned creator", async () => {
    await testDb.current.db
      .insert(customActionBans)
      .values({ userId: "u1", createdAt: "2026-01-01" });
    await supertest(app)
      .put("/api/customActions/user/u1")
      .send(body)
      .expect(400, { error: "You can't create custom actions." });
  });
});

describe("guild custom action routes", () => {
  const put = (guildId = "g1", userId = "u9") =>
    supertest(app).put(`/api/customActions/guild/${guildId}/user/${userId}`).send(body);

  it("PUT saves as the guild, records the creator and syncs", async () => {
    const res = await put().expect(200);
    expect(res.body.action).toMatchObject({ scope: "guild", ownerId: "g1", createdBy: "u9" });
    expect(syncMock).toHaveBeenCalledWith(client, "g1");
    const list = await supertest(app).get("/api/customActions/guild/g1").expect(200);
    expect(list.body.actions).toHaveLength(1);
  });

  it("PUT from a user who cannot manage the server returns 403", async () => {
    canManageMock.mockResolvedValue(false);
    await put().expect(403, { error: "forbidden" });
    expect(syncMock).not.toHaveBeenCalled();
  });

  it("PUT and DELETE for a guild the bot is not in return the add-bot error", async () => {
    const error = "Add PetBot to this server to create server actions.";
    await put("g2").expect(400, { error });
    await supertest(app).delete("/api/customActions/guild/g2/user/u9/boop").expect(400, { error });
    expect(canManageMock).not.toHaveBeenCalled();
  });

  it("PUT enforces validation, the limit and the ban", async () => {
    await supertest(app)
      .put("/api/customActions/guild/g1/user/u9")
      .send({ ...body, name: "pet" })
      .expect(400, { error: "That name is already a built-in action or command." });
    for (const name of ["a", "b", "c", "d", "e"]) {
      await supertest(app).put("/api/customActions/guild/g1/user/u9").send({ ...body, name }).expect(200);
    }
    await put().expect(400, { error: "This server has reached the limit of 5 custom actions." });
    await testDb.current.db.delete(customActions);
    await testDb.current.db.insert(customActionBans).values({ userId: "u9", createdAt: "2026-01-01" });
    await put().expect(400, { error: "You can't create custom actions." });
  });

  it("PUT rejects an image that fails the check without syncing", async () => {
    checkImageMock.mockResolvedValue(false);
    await put().expect(400, { error: "Your URL is invalid, please try again" });
    expect(syncMock).not.toHaveBeenCalled();
  });

  it("DELETE requires manage rights, then removes and syncs", async () => {
    await put().expect(200);
    canManageMock.mockResolvedValue(false);
    await supertest(app).delete("/api/customActions/guild/g1/user/u9/boop").expect(403, { error: "forbidden" });
    canManageMock.mockResolvedValue(true);
    syncMock.mockClear();
    await supertest(app).delete("/api/customActions/guild/g1/user/u9/boop").expect(200, { ok: true });
    expect(syncMock).toHaveBeenCalledWith(client, "g1");
    await supertest(app).delete("/api/customActions/guild/g1/user/u9/boop").expect(404, { error: "not_found" });
  });

  it("a failed sync does not change the response", async () => {
    syncMock.mockResolvedValue(false);
    await put().expect(200);
  });
});
