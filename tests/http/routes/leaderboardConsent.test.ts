import { describe, it, expect, vi, beforeEach } from "vitest";
import supertest from "supertest";

const { selectMock, insertMock, deleteMock } = vi.hoisted(() => ({
  selectMock: vi.fn(),
  insertMock: vi.fn(),
  deleteMock: vi.fn(),
}));

vi.mock("../../../src/db/connector.js", () => ({
  drizzleDb: {
    select: selectMock,
    insert: insertMock,
    delete: deleteMock,
  },
}));
vi.mock("../../../src/db/schema.js", () => ({
  leaderboardConsent: {
    hashedUserId: Symbol("hashed_user_id"),
    displayName: Symbol("display_name"),
    createdAt: Symbol("createdAt"),
    updatedAt: Symbol("updatedAt"),
  },
}));
vi.mock("../../../src/logger.js", () => ({
  default: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

import { createApp } from "../../../src/http/expressServer.js";

describe("/api/leaderboardConsent/:hashedUserId", () => {
  let app: ReturnType<typeof createApp>;

  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.INTERNAL_API_SECRET;
    app = createApp();
  });

  describe("GET", () => {
    it("returns enabled false when no row exists", async () => {
      (selectMock as any).mockImplementation(() => ({
        from: () => ({
          where: () => ({ limit: () => Promise.resolve([]) }),
        }),
      }));

      const res = await supertest(app).get("/api/leaderboardConsent/abc123").expect(200);
      expect(res.body).toEqual({ enabled: false, displayName: null });
    });

    it("returns enabled true with displayName when row exists", async () => {
      (selectMock as any).mockImplementation(() => ({
        from: () => ({
          where: () => ({
            limit: () => Promise.resolve([{ hashedUserId: "abc123", displayName: "TestUser" }]),
          }),
        }),
      }));

      const res = await supertest(app).get("/api/leaderboardConsent/abc123").expect(200);
      expect(res.body).toEqual({ enabled: true, displayName: "TestUser" });
    });

    it("returns 500 on DB error", async () => {
      (selectMock as any).mockImplementation(() => {
        throw new Error("db-failure");
      });
      await supertest(app).get("/api/leaderboardConsent/abc123").expect(500);
    });
  });

  describe("POST", () => {
    it("inserts or upserts consent row", async () => {
      const onConflictDoUpdate = vi.fn().mockResolvedValue(undefined);
      const values = vi.fn(() => ({ onConflictDoUpdate }));
      (insertMock as any).mockReturnValue({ values });

      const res = await supertest(app)
        .post("/api/leaderboardConsent/abc123")
        .send({ displayName: "MyName" })
        .expect(200);

      expect(res.body).toEqual({ ok: true });
      expect(insertMock).toHaveBeenCalled();
      expect(values).toHaveBeenCalled();
      expect(onConflictDoUpdate).toHaveBeenCalled();
    });

    it("returns 400 when displayName is missing", async () => {
      const res = await supertest(app)
        .post("/api/leaderboardConsent/abc123")
        .send({})
        .expect(400);
      expect(res.body).toEqual({ error: "displayName_required" });
    });

    it("returns 400 when displayName is whitespace only", async () => {
      const res = await supertest(app)
        .post("/api/leaderboardConsent/abc123")
        .send({ displayName: "   " })
        .expect(400);
      expect(res.body).toEqual({ error: "displayName_required" });
    });

    it("returns 500 on DB error", async () => {
      (insertMock as any).mockImplementation(() => {
        throw new Error("db-failure");
      });
      await supertest(app)
        .post("/api/leaderboardConsent/abc123")
        .send({ displayName: "MyName" })
        .expect(500);
    });
  });

  describe("DELETE", () => {
    it("removes consent row", async () => {
      const where = vi.fn().mockResolvedValue(undefined);
      (deleteMock as any).mockReturnValue({ where });

      const res = await supertest(app)
        .delete("/api/leaderboardConsent/abc123")
        .expect(200);

      expect(res.body).toEqual({ ok: true });
      expect(deleteMock).toHaveBeenCalled();
      expect(where).toHaveBeenCalled();
    });

    it("returns 500 on DB error", async () => {
      (deleteMock as any).mockImplementation(() => {
        throw new Error("db-failure");
      });
      await supertest(app).delete("/api/leaderboardConsent/abc123").expect(500);
    });
  });
});
