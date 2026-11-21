import { describe, it, expect, vi, beforeEach } from "vitest";
import supertest from "supertest";

const { selectMock } = vi.hoisted(() => ({
  selectMock: vi.fn(),
}));

vi.mock("../../../src/db/connector.js", () => ({
  drizzleDb: { select: selectMock },
}));
vi.mock("../../../src/db/schema.js", () => ({
  actionData: { locationId: Symbol("location_id"), userId: Symbol("user_id") },
  botData: { guildId: Symbol("guild_id") },
  userSessions: {},
  optOut: {},
}));
vi.mock("../../../src/logger.js", () => ({
  default: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

import { createApp } from "../../../src/http/expressServer.js";

describe("GET /api/guilds", () => {
  let app: ReturnType<typeof createApp>;

  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.INTERNAL_API_SECRET;
    app = createApp();
  });

  it("returns all guild IDs when no userId is provided", async () => {
    (selectMock as any).mockImplementation(() => ({
      from: () => Promise.resolve([{ guild_id: "g1" }, { guild_id: "g2" }]),
    }));

    const res = await supertest(app).get("/api/guilds").expect(200);

    expect(res.body).toEqual({ guildIds: ["g1", "g2"] });
  });

  it("returns empty array when no guilds exist", async () => {
    (selectMock as any).mockImplementation(() => ({
      from: () => Promise.resolve([]),
    }));

    const res = await supertest(app).get("/api/guilds").expect(200);

    expect(res.body).toEqual({ guildIds: [] });
  });

  it("returns 404 for unsupported methods", async () => {
    await supertest(app).post("/api/guilds").expect(404);
  });
});

describe("GET /api/guilds/user/:userId", () => {
  let app: ReturnType<typeof createApp>;

  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.INTERNAL_API_SECRET;
    app = createApp();
  });

  it("returns guild IDs for a specific user", async () => {
    (selectMock as any).mockImplementation(() => ({
      from: () => ({
        where: () => ({
          groupBy: () =>
            Promise.resolve([{ location_id: "g1" }, { location_id: "g3" }]),
        }),
      }),
    }));

    const res = await supertest(app).get("/api/guilds/user/user-1").expect(200);

    expect(res.body).toEqual({ guildIds: ["g1", "g3"] });
  });
});

describe("GET /api/guilds/bot/:guildId", () => {
  const client = { guilds: { cache: new Map([["g1", {}]]) } } as any;

  it.each([
    ["g1", true],
    ["unsetup", false],
  ])("answers from the guild cache for %s", async (guildId, isBotGuild) => {
    delete process.env.INTERNAL_API_SECRET;
    const res = await supertest(createApp(client))
      .get(`/api/guilds/bot/${guildId}`)
      .expect(200);
    expect(res.body).toEqual({ isBotGuild });
  });
});
