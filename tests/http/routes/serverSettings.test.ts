import { describe, it, expect, vi, beforeEach } from "vitest";
import supertest from "supertest";

const { selectMock, updateMock, isGuildAdminMock } = vi.hoisted(() => ({
  selectMock: vi.fn(),
  updateMock: vi.fn(),
  isGuildAdminMock: vi.fn(),
}));

vi.mock("../../../src/db/connector.js", () => ({
  drizzleDb: {
    select: selectMock,
    update: updateMock,
  },
}));

vi.mock("../../../src/db/schema.js", () => ({
  botData: {
    guildId: Symbol("guild_id"),
    logChannel: Symbol("log_channel"),
    nickname: Symbol("nickname"),
    sleepImage: Symbol("sleep_image"),
    defaultImages: Symbol("default_images"),
    restricted: Symbol("restricted"),
    updatedAt: Symbol("updated_at"),
  },
}));

vi.mock("../../../src/utilities/helper.js", () => ({
  isGuildAdmin: isGuildAdminMock,
}));

vi.mock("../../../src/logger.js", () => ({
  default: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

import { createApp } from "../../../src/http/expressServer.js";

function buildSelectReturn(values: Array<Record<string, unknown>>) {
  return {
    from: () => ({
      where: () => ({
        limit: () => Promise.resolve(values),
      }),
    }),
  };
}

const mockSettings = {
  logChannel: "C123",
  nickname: "PetBot",
  sleepImage: "http://img",
  defaultImages: { pet: "x" },
  restricted: 1,
  updatedAt: "2026-01-01T00:00:00.000Z",
};

describe("/api/serverSettings/:guildId/:userId", () => {
  let app: ReturnType<typeof createApp>;

  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.INTERNAL_API_SECRET;
    isGuildAdminMock.mockResolvedValue(true);
    app = createApp({} as any);
  });

  describe("GET", () => {
    it("returns 403 when user is not guild admin", async () => {
      isGuildAdminMock.mockResolvedValue(false);

      const res = await supertest(app)
        .get("/api/serverSettings/G1/userId/U1")
        .expect(403);

      expect(res.body).toEqual({ error: "forbidden" });
    });

    it("returns 404 when no settings row exists", async () => {
      selectMock.mockReturnValue(buildSelectReturn([]));

      const res = await supertest(app)
        .get("/api/serverSettings/G1/userId/U1")
        .expect(404);

      expect(res.body).toEqual({ error: "not_found" });
    });

    it("returns 200 with settings when guild admin", async () => {
      selectMock.mockReturnValue(buildSelectReturn([mockSettings]));

      const res = await supertest(app)
        .get("/api/serverSettings/G1/userId/U1")
        .expect(200);

      expect(res.body).toEqual({ settings: mockSettings });
    });

    it("returns 500 on DB error", async () => {
      selectMock.mockImplementation(() => {
        throw new Error("db-failure");
      });

      const res = await supertest(app)
        .get("/api/serverSettings/G1/userId/U1")
        .expect(500);

      expect(res.body).toMatchObject({
        error: "server_error",
        reason: "fetch_settings_failed",
      });
    });
  });

  describe("PATCH", () => {
    it("returns 403 when user is not guild admin", async () => {
      isGuildAdminMock.mockResolvedValue(false);

      const res = await supertest(app)
        .patch("/api/serverSettings/G1/userId/U1")
        .send({ nickname: "NewName" })
        .expect(403);

      expect(res.body).toEqual({ error: "forbidden" });
    });

    it("returns 404 when no settings row exists", async () => {
      selectMock.mockReturnValue(buildSelectReturn([]));

      const res = await supertest(app)
        .patch("/api/serverSettings/G1/userId/U1")
        .send({ nickname: "NewName" })
        .expect(404);

      expect(res.body).toEqual({ error: "not_found" });
    });

    it("returns 400 for non-object body", async () => {
      selectMock.mockReturnValue(buildSelectReturn([mockSettings]));

      const res = await supertest(app)
        .patch("/api/serverSettings/G1/userId/U1")
        .send([1, 2, 3])
        .expect(400);

      expect(res.body).toMatchObject({
        error: "invalid_payload",
        reason: "body_must_be_object",
      });
    });

    it("returns 400 for disallowed keys", async () => {
      selectMock.mockReturnValue(buildSelectReturn([mockSettings]));

      const res = await supertest(app)
        .patch("/api/serverSettings/G1/userId/U1")
        .send({ badField: "nope" })
        .expect(400);

      expect(res.body).toMatchObject({
        error: "invalid_update_keys",
        reason: "update_keys_not_allowed",
        details: ["badField"],
      });
    });

    it("returns 400 for restricted wrong type", async () => {
      selectMock.mockReturnValue(buildSelectReturn([mockSettings]));

      const res = await supertest(app)
        .patch("/api/serverSettings/G1/userId/U1")
        .send({ restricted: "yes" })
        .expect(400);

      expect(res.body).toEqual({
        error: "invalid_field_type",
        field: "restricted",
      });
    });

    it("returns 400 for defaultImages wrong type", async () => {
      selectMock.mockReturnValue(buildSelectReturn([mockSettings]));

      const res = await supertest(app)
        .patch("/api/serverSettings/G1/userId/U1")
        .send({ defaultImages: null })
        .expect(400);

      expect(res.body).toEqual({
        error: "invalid_field_type",
        field: "defaultImages",
      });
    });

    it("returns 400 for logChannel wrong type", async () => {
      selectMock.mockReturnValue(buildSelectReturn([mockSettings]));

      const res = await supertest(app)
        .patch("/api/serverSettings/G1/userId/U1")
        .send({ logChannel: 42 })
        .expect(400);

      expect(res.body).toEqual({
        error: "invalid_field_type",
        field: "logChannel",
      });
    });

    it("returns 400 for empty body", async () => {
      selectMock.mockReturnValue(buildSelectReturn([mockSettings]));

      const res = await supertest(app)
        .patch("/api/serverSettings/G1/userId/U1")
        .send({})
        .expect(400);

      expect(res.body).toEqual({
        error: "invalid_payload",
        reason: "no_fields_to_update",
      });
    });

    it("returns 500 when DB update fails", async () => {
      selectMock.mockReturnValue(buildSelectReturn([mockSettings]));
      updateMock.mockImplementation(() => ({
        set: () => ({
          where: () => Promise.reject(new Error("update_failure")),
        }),
      }));

      const res = await supertest(app)
        .patch("/api/serverSettings/G1/userId/U1")
        .send({ nickname: "NewName" })
        .expect(500);

      expect(res.body).toMatchObject({
        error: "update_failed",
        reason: "db_update_failed",
        details: "update_failure",
      });
    });

    it("returns 200 and updates allowed fields", async () => {
      selectMock.mockReturnValue(buildSelectReturn([mockSettings]));
      updateMock.mockImplementation(() => ({
        set: () => ({
          where: () => Promise.resolve(),
        }),
      }));

      const res = await supertest(app)
        .patch("/api/serverSettings/G1/userId/U1")
        .send({ nickname: "PetBot2", restricted: 0, logChannel: "C456" })
        .expect(200);

      expect(updateMock).toHaveBeenCalled();
      expect(res.body).toMatchObject({
        success: true,
        settings: {
          logChannel: "C456",
          nickname: "PetBot2",
          sleepImage: "http://img",
          defaultImages: { pet: "x" },
          restricted: false,
        },
      });
      expect(typeof res.body.settings.updatedAt).toBe("string");
    });
  });

  describe("method not allowed", () => {
    it("returns 404 for POST (method not registered)", async () => {
      await supertest(app)
        .post("/api/serverSettings/G1/userId/U1")
        .send({ nickname: "test" })
        .expect(404);
    });

    it("returns 404 for DELETE (method not registered)", async () => {
      await supertest(app).delete("/api/serverSettings/G1/userId/U1").expect(404);
    });
  });
});
