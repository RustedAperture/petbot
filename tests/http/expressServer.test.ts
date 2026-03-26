import { describe, it, expect, vi, beforeEach } from "vitest";
import supertest from "supertest";

// --- Hoisted mock functions (survive vi.resetAllMocks) ---
const { statsMock, guildsMock, userDataMock, setImagesMock } = vi.hoisted(
  () => {
    const expressHandler = () =>
      vi.fn().mockImplementation((_req: any, res: any) => {
        res.json({ ok: true });
      });
    return {
      statsMock: expressHandler(),
      guildsMock: expressHandler(),
      userDataMock: expressHandler(),
      setImagesMock: expressHandler(),
    };
  },
);

// --- Mock logger to suppress output ---
vi.mock("../../src/logger.js", () => ({
  default: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

// --- Mock migrated Express route handlers ---
vi.mock("../../src/http/routes/stats.js", () => ({ default: statsMock }));
vi.mock("../../src/http/routes/guilds.js", () => ({ default: guildsMock }));
vi.mock("../../src/http/routes/userSessions.js", () => {
  const { Router } = require("express");
  const router = Router();
  router.get("/:userId", (_req: any, res: any) => res.json({ ok: true }));
  router.post("/:userId", (_req: any, res: any) => res.json({ ok: true }));
  router.delete("/:userId", (_req: any, res: any) => res.json({ ok: true }));
  return { default: router };
});
vi.mock("../../src/http/routes/userData.js", () => ({ default: userDataMock }));
vi.mock("../../src/http/routes/optOut.js", () => {
  const { Router } = require("express");
  const router = Router();
  router.get("/:userId", (_req: any, res: any) => res.json({ ok: true }));
  router.post("/:userId", (_req: any, res: any) => res.json({ ok: true }));
  router.delete("/:userId", (_req: any, res: any) => res.json({ ok: true }));
  return { default: router };
});
vi.mock("../../src/http/routes/setImages.js", () => ({
  default: setImagesMock,
}));
vi.mock("../../src/http/routes/serverSettings.js", () => ({
  default: (_client: any) => {
    const { Router } = require("express");
    const router = Router();
    router.get("/:guildId/userId/:userId", (_req: any, res: any) =>
      res.json({ ok: true }),
    );
    router.patch("/:guildId/userId/:userId", (_req: any, res: any) =>
      res.json({ ok: true }),
    );
    return router;
  },
}));
vi.mock("../../src/http/routes/guildChannels.js", () => ({
  default: (_client: any) => (_req: any, res: any) => res.json({ ok: true }),
}));

import { createApp } from "../../src/http/expressServer.js";
import { readiness } from "../../src/http/readiness.js";

describe("expressServer - createApp", () => {
  let app: ReturnType<typeof createApp>;

  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.INTERNAL_API_SECRET;
    readiness.botReady = false;
    readiness.dbReady = false;
    app = createApp();
  });

  describe("GET /api/health", () => {
    it("returns 200 with ok, version, uptime, timestamp", async () => {
      const res = await supertest(app).get("/api/health").expect(200);

      expect(res.body.ok).toBe(true);
      expect(typeof res.body.version).toBe("string");
      expect(typeof res.body.uptime).toBe("number");
      expect(typeof res.body.timestamp).toBe("string");
    });
  });

  describe("GET /api/ready", () => {
    it("returns 503 when not ready", async () => {
      const res = await supertest(app).get("/api/ready").expect(503);

      expect(res.body.ready).toBe(false);
      expect(res.body.bot).toBe(false);
      expect(res.body.db).toBe(false);
    });

    it("returns 200 when both bot and db are ready", async () => {
      readiness.botReady = true;
      readiness.dbReady = true;

      const res = await supertest(app).get("/api/ready").expect(200);

      expect(res.body.ready).toBe(true);
      expect(res.body.bot).toBe(true);
      expect(res.body.db).toBe(true);
    });
  });

  describe("404 fallback", () => {
    it("returns 404 for unmatched /api/* routes", async () => {
      const res = await supertest(app).get("/api/nonexistent").expect(404);

      expect(res.body).toEqual({ error: "not_found" });
    });

    it("returns 404 for /api/foo/bar", async () => {
      const res = await supertest(app).post("/api/foo/bar").expect(404);

      expect(res.body).toEqual({ error: "not_found" });
    });
  });

  describe("auth middleware", () => {
    describe("with INTERNAL_API_SECRET set", () => {
      beforeEach(() => {
        process.env.INTERNAL_API_SECRET = "test-secret";
      });

      it("rejects requests without key header (401)", async () => {
        await supertest(app).get("/api/health").expect(401);
      });

      it("rejects requests with wrong key (401)", async () => {
        await supertest(app)
          .get("/api/health")
          .set("x-internal-api-key", "wrong")
          .expect(401);
      });

      it("allows requests with correct x-internal-api-key", async () => {
        await supertest(app)
          .get("/api/health")
          .set("x-internal-api-key", "test-secret")
          .expect(200);
      });

      it("allows requests with correct x-internal-secret", async () => {
        await supertest(app)
          .get("/api/health")
          .set("x-internal-secret", "test-secret")
          .expect(200);
      });
    });

    describe("without INTERNAL_API_SECRET (localhost mode)", () => {
      it("allows localhost requests", async () => {
        await supertest(app).get("/api/health").expect(200);
      });
    });
  });

  describe("JSON body parsing", () => {
    it("accepts JSON request bodies", async () => {
      const res = await supertest(app)
        .post("/api/optOut")
        .send({ test: true })
        .set("Content-Type", "application/json");

      expect(res.status).not.toBe(413);
      expect(res.status).not.toBe(400);
    });
  });

  describe("migrated route wiring", () => {
    it("routes GET /api/stats to the stats handler", async () => {
      await supertest(app).get("/api/stats").expect(200);

      expect(statsMock).toHaveBeenCalled();
    });

    it("routes GET /api/guilds to the guilds handler", async () => {
      await supertest(app).get("/api/guilds").expect(200);

      expect(guildsMock).toHaveBeenCalled();
    });

    it("routes GET /api/userSessions/:userId", async () => {
      const res = await supertest(app).get("/api/userSessions/u1").expect(200);

      expect(res.body.ok).toBe(true);
    });

    it("routes POST /api/userSessions/:userId", async () => {
      const res = await supertest(app)
        .post("/api/userSessions/u1")
        .send({ guilds: [] })
        .expect(200);

      expect(res.body.ok).toBe(true);
    });

    it("routes DELETE /api/userSessions/:userId", async () => {
      const res = await supertest(app)
        .delete("/api/userSessions/u1")
        .expect(200);

      expect(res.body.ok).toBe(true);
    });

    it("routes DELETE /api/userData/:userId to the userData handler", async () => {
      await supertest(app).delete("/api/userData/u1").expect(200);

      expect(userDataMock).toHaveBeenCalled();
    });
  });
});

describe("expressServer - createApp with client", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.INTERNAL_API_SECRET;
  });

  it("registers /api/serverSettings when client is provided", async () => {
    const mockClient = { id: "bot-123" } as any;
    const appWithClient = createApp(mockClient);

    const res = await supertest(appWithClient)
      .get("/api/serverSettings/G1/userId/U1")
      .expect(200);

    expect(res.body.ok).toBe(true);
  });

  it("registers /api/guildChannels when client is provided", async () => {
    const mockClient = { id: "bot-123" } as any;
    const appWithClient = createApp(mockClient);

    const res = await supertest(appWithClient)
      .get("/api/guildChannels/G1/user/U1")
      .expect(200);

    expect(res.body.ok).toBe(true);
  });

  it("does not register /api/serverSettings when client is not provided", async () => {
    const appNoClient = createApp();

    const res = await supertest(appNoClient)
      .get("/api/serverSettings/G1/userId/U1")
      .expect(404);

    expect(res.body).toEqual({ error: "not_found" });
  });
});
