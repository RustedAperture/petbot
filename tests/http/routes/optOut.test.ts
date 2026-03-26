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
  optOut: { userId: Symbol("user_id") },
}));
vi.mock("../../../src/logger.js", () => ({
  default: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

import { createApp } from "../../../src/http/expressServer.js";

describe("/api/optOut/:userId", () => {
  let app: ReturnType<typeof createApp>;

  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.INTERNAL_API_SECRET;
    app = createApp();
  });

  describe("GET", () => {
    it("returns optedOut false when no row exists", async () => {
      (selectMock as any).mockImplementation(() => ({
        from: () => ({
          where: () => ({ limit: () => Promise.resolve([]) }),
        }),
      }));

      const res = await supertest(app).get("/api/optOut/u1").expect(200);

      expect(res.body).toEqual({ optedOut: false });
    });

    it("returns optedOut true when row exists", async () => {
      (selectMock as any).mockImplementation(() => ({
        from: () => ({
          where: () => ({ limit: () => Promise.resolve([{ userId: "u1" }]) }),
        }),
      }));

      const res = await supertest(app).get("/api/optOut/u1").expect(200);

      expect(res.body).toEqual({ optedOut: true });
    });

    it("returns 500 on DB error", async () => {
      (selectMock as any).mockImplementation(() => {
        throw new Error("db-failure");
      });

      await supertest(app).get("/api/optOut/u1").expect(500);
    });
  });

  describe("POST", () => {
    it("inserts or upserts opt-out row", async () => {
      const onConflictDoUpdate = vi.fn().mockResolvedValue(undefined);
      const values = vi.fn(() => ({ onConflictDoUpdate }));
      (insertMock as any).mockReturnValue({ values });

      const res = await supertest(app).post("/api/optOut/u2").expect(200);

      expect(res.body).toEqual({ ok: true });
      expect(insertMock).toHaveBeenCalled();
      expect(values).toHaveBeenCalled();
      expect(onConflictDoUpdate).toHaveBeenCalled();
    });

    it("returns 500 on DB error", async () => {
      (insertMock as any).mockImplementation(() => {
        throw new Error("db-failure");
      });

      await supertest(app).post("/api/optOut/u2").expect(500);
    });
  });

  describe("DELETE", () => {
    it("removes opt-out row", async () => {
      const where = vi.fn().mockResolvedValue(undefined);
      (deleteMock as any).mockReturnValue({ where });

      const res = await supertest(app).delete("/api/optOut/u3").expect(200);

      expect(res.body).toEqual({ ok: true });
      expect(deleteMock).toHaveBeenCalled();
      expect(where).toHaveBeenCalled();
    });

    it("returns 500 on DB error", async () => {
      (deleteMock as any).mockImplementation(() => {
        throw new Error("db-failure");
      });

      await supertest(app).delete("/api/optOut/u3").expect(500);
    });
  });

  describe("method not allowed", () => {
    it("returns 404 for PUT (method not registered)", async () => {
      await supertest(app).put("/api/optOut/u1").expect(404);
    });
  });
});
