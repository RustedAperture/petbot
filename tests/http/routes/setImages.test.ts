import { describe, it, expect, vi, beforeEach } from "vitest";
import supertest from "supertest";

const { selectMock, updateMock, insertMock } = vi.hoisted(() => ({
  selectMock: vi.fn(),
  updateMock: vi.fn(),
  insertMock: vi.fn(),
}));

vi.mock("../../../src/db/connector.js", () => ({
  drizzleDb: {
    select: selectMock,
    update: updateMock,
    insert: insertMock,
  },
}));
vi.mock("../../../src/db/schema.js", () => ({
  actionData: {
    userId: Symbol("user_id"),
    locationId: Symbol("location_id"),
    actionType: Symbol("action_type"),
    id: Symbol("id"),
    images: Symbol("images"),
  },
}));
vi.mock("../../../src/logger.js", () => ({
  default: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

import { createApp } from "../../../src/http/expressServer.js";

const validBody = {
  userId: "111",
  guildId: "999",
  actionType: "pet",
  images: ["https://example.com/pet.png", ""],
};

describe("POST /api/setImages", () => {
  let app: ReturnType<typeof createApp>;

  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.INTERNAL_API_SECRET;
    app = createApp();
  });

  describe("validation", () => {
    it("non-numeric userId → 400 invalid_userId", async () => {
      const res = await supertest(app)
        .post("/api/setImages")
        .send({ ...validBody, userId: "not-a-number" })
        .expect(400);

      expect(res.body).toEqual({ error: "invalid_userId" });
    });

    it("unknown actionType → 400 invalid_actionType", async () => {
      const res = await supertest(app)
        .post("/api/setImages")
        .send({ ...validBody, actionType: "slap" })
        .expect(400);

      expect(res.body).toEqual({ error: "invalid_actionType" });
    });

    it("images not an array → 400 invalid_images", async () => {
      const res = await supertest(app)
        .post("/api/setImages")
        .send({ ...validBody, images: "https://example.com" })
        .expect(400);

      expect(res.body).toEqual({ error: "invalid_images" });
    });

    it("more than 4 images → 400 invalid_images", async () => {
      const res = await supertest(app)
        .post("/api/setImages")
        .send({
          ...validBody,
          images: [
            "https://a.com",
            "https://b.com",
            "https://c.com",
            "https://d.com",
            "https://e.com",
          ],
        })
        .expect(400);

      expect(res.body).toEqual({ error: "invalid_images" });
    });

    it("non-http(s) URL in images → 400 invalid_images", async () => {
      const res = await supertest(app)
        .post("/api/setImages")
        .send({ ...validBody, images: ["ftp://evil.com"] })
        .expect(400);

      expect(res.body).toEqual({ error: "invalid_images" });
    });

    it("non-numeric guildId (without everywhere) → 400 invalid_guildId", async () => {
      const res = await supertest(app)
        .post("/api/setImages")
        .send({ ...validBody, guildId: "not-a-guild" })
        .expect(400);

      expect(res.body).toEqual({ error: "invalid_guildId" });
    });
  });

  describe("not_found guard", () => {
    it("returns 404 when user has no rows for that guild", async () => {
      (selectMock as any).mockImplementation(() => ({
        from: () => ({
          where: () => ({ limit: () => Promise.resolve([]) }),
        }),
      }));

      const res = await supertest(app)
        .post("/api/setImages")
        .send(validBody)
        .expect(404);

      expect(res.body).toEqual({ error: "not_found" });
    });
  });

  describe("successful update", () => {
    it("updates existing action row when found", async () => {
      const presenceRow = { id: 1 };
      const actionRow = { id: 42 };

      (selectMock as any)
        .mockReturnValueOnce({
          from: () => ({
            where: () => ({ limit: () => Promise.resolve([presenceRow]) }),
          }),
        })
        .mockReturnValueOnce({
          from: () => ({
            where: () => ({ limit: () => Promise.resolve([actionRow]) }),
          }),
        });

      const updateWhere = vi.fn().mockResolvedValue(undefined);
      const updateSet = vi.fn(() => ({ where: updateWhere }));
      (updateMock as any).mockReturnValueOnce({ set: updateSet });

      const res = await supertest(app)
        .post("/api/setImages")
        .send(validBody)
        .expect(200);

      expect(res.body).toEqual({ ok: true });
      expect(updateMock).toHaveBeenCalledTimes(1);
      const setCall = (updateSet.mock.calls[0] as any)?.[0];
      expect(setCall?.images).toEqual(["https://example.com/pet.png"]);
    });

    it("inserts new row when action not found but guild presence exists", async () => {
      const presenceRow = { id: 1 };

      (selectMock as any)
        .mockReturnValueOnce({
          from: () => ({
            where: () => ({ limit: () => Promise.resolve([presenceRow]) }),
          }),
        })
        .mockReturnValueOnce({
          from: () => ({
            where: () => ({ limit: () => Promise.resolve([]) }),
          }),
        });

      const insertValues = vi.fn().mockResolvedValue(undefined);
      (insertMock as any).mockReturnValue({ values: insertValues });

      const res = await supertest(app)
        .post("/api/setImages")
        .send(validBody)
        .expect(200);

      expect(res.body).toEqual({ ok: true });
      expect(insertMock).toHaveBeenCalledTimes(1);
      const inserted = insertValues.mock.calls[0][0];
      expect(inserted.userId).toBe(validBody.userId);
      expect(inserted.locationId).toBe(validBody.guildId);
      expect(inserted.images).toEqual(["https://example.com/pet.png"]);
    });

    it("everywhere=true issues bulk UPDATE without prior SELECT", async () => {
      const updateWhere = vi.fn().mockResolvedValue(undefined);
      const updateSet = vi.fn(() => ({ where: updateWhere }));
      (updateMock as any).mockReturnValueOnce({ set: updateSet });

      const res = await supertest(app)
        .post("/api/setImages")
        .send({
          userId: "111",
          actionType: "pet",
          images: ["https://example.com/pet.png"],
          everywhere: true,
        })
        .expect(200);

      expect(res.body).toEqual({ ok: true });
      expect(updateMock).toHaveBeenCalledTimes(1);
      expect(selectMock).not.toHaveBeenCalled();
    });
  });

  describe("method not allowed", () => {
    it("returns 404 for GET (method not registered)", async () => {
      await supertest(app).get("/api/setImages").expect(404);
    });
  });
});
