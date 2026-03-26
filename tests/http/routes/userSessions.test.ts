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
  userSessions: { userId: Symbol("user_id") },
}));
vi.mock("../../../src/logger.js", () => ({
  default: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

import { createApp } from "../../../src/http/expressServer.js";

describe("/api/userSessions/:userId", () => {
  let app: ReturnType<typeof createApp>;

  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.INTERNAL_API_SECRET;
    app = createApp();
  });

  describe("GET", () => {
    it("returns guilds for a user", async () => {
      (selectMock as any).mockImplementation(() => ({
        from: () => ({
          where: () => ({
            limit: () => Promise.resolve([{ guilds: ["g1", "g2"] }]),
          }),
        }),
      }));

      const res = await supertest(app).get("/api/userSessions/u1").expect(200);

      expect(res.body).toEqual({ guilds: ["g1", "g2"] });
    });

    it("returns null when user has no session", async () => {
      (selectMock as any).mockImplementation(() => ({
        from: () => ({
          where: () => ({
            limit: () => Promise.resolve([]),
          }),
        }),
      }));

      const res = await supertest(app).get("/api/userSessions/u1").expect(200);

      expect(res.body).toEqual({ guilds: null });
    });
  });

  describe("POST", () => {
    it("upserts session data", async () => {
      const onConflictDoUpdate = vi.fn().mockResolvedValue(undefined);
      const values = vi.fn(() => ({ onConflictDoUpdate }));
      (insertMock as any).mockReturnValue({ values });

      const res = await supertest(app)
        .post("/api/userSessions/u1")
        .send({ guilds: ["g1", "g2"] })
        .expect(200);

      expect(res.body).toEqual({ ok: true });
      expect(insertMock).toHaveBeenCalled();
      expect(values).toHaveBeenCalled();
      expect(onConflictDoUpdate).toHaveBeenCalled();
    });
  });

  describe("DELETE", () => {
    it("deletes session for a user", async () => {
      const where = vi.fn().mockResolvedValue(undefined);
      (deleteMock as any).mockReturnValue({ where });

      const res = await supertest(app)
        .delete("/api/userSessions/u1")
        .expect(200);

      expect(res.body).toEqual({ ok: true });
      expect(deleteMock).toHaveBeenCalled();
      expect(where).toHaveBeenCalled();
    });
  });
});
