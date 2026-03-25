import { describe, it, expect, vi, beforeEach } from "vitest";
import supertest from "supertest";

// --- Hoisted mock functions (survive vi.resetAllMocks) ---
const {
  statsMock,
  guildsMock,
  userSessionsMock,
  userDataMock,
  optOutMock,
  setImagesMock,
  serverSettingsMock,
  guildChannelsMock,
} = vi.hoisted(() => {
  const handler = () =>
    vi.fn().mockImplementation((_req: any, res: any) => {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true }));
    });
  return {
    statsMock: handler(),
    guildsMock: handler(),
    userSessionsMock: handler(),
    userDataMock: handler(),
    optOutMock: handler(),
    setImagesMock: handler(),
    serverSettingsMock: handler(),
    guildChannelsMock: handler(),
  };
});

// --- Mock logger to suppress output ---
vi.mock("../../src/logger.js", () => ({
  default: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

// --- Mock legacy API handlers ---
vi.mock("../../src/http/api/stats.js", () => ({ default: statsMock }));
vi.mock("../../src/http/api/guilds.js", () => ({ default: guildsMock }));
vi.mock("../../src/http/api/userSessions.js", () => ({
  default: userSessionsMock,
}));
vi.mock("../../src/http/api/userData.js", () => ({ default: userDataMock }));
vi.mock("../../src/http/api/optOut.js", () => ({ default: optOutMock }));
vi.mock("../../src/http/api/setImages.js", () => ({ default: setImagesMock }));
vi.mock("../../src/http/api/serverSettings.js", () => ({
  default: serverSettingsMock,
}));
vi.mock("../../src/http/api/guildChannels.js", () => ({
  default: guildChannelsMock,
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
        .post("/api/stats")
        .send({ test: true })
        .set("Content-Type", "application/json");

      expect(res.status).not.toBe(413);
      expect(res.status).not.toBe(400);
    });
  });

  describe("legacy route adaptation", () => {
    it("routes /api/stats to the legacy handler", async () => {
      await supertest(app).get("/api/stats").expect(200);

      expect(statsMock).toHaveBeenCalled();
    });

    it("routes /api/guilds to the legacy handler", async () => {
      await supertest(app).get("/api/guilds").expect(200);

      expect(guildsMock).toHaveBeenCalled();
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

    await supertest(appWithClient).get("/api/serverSettings").expect(200);

    expect(serverSettingsMock).toHaveBeenCalled();
  });

  it("registers /api/guildChannels when client is provided", async () => {
    const mockClient = { id: "bot-123" } as any;
    const appWithClient = createApp(mockClient);

    await supertest(appWithClient).get("/api/guildChannels").expect(200);

    expect(guildChannelsMock).toHaveBeenCalled();
  });

  it("does not register /api/serverSettings when client is not provided", async () => {
    const appNoClient = createApp();

    const res = await supertest(appNoClient)
      .get("/api/serverSettings")
      .expect(404);

    expect(res.body).toEqual({ error: "not_found" });
  });
});
