import { describe, it, expect, vi, beforeEach } from "vitest";
import supertest from "supertest";

const { isGuildAdminMock } = vi.hoisted(() => ({
  isGuildAdminMock: vi.fn(),
}));

vi.mock("../../../src/utilities/helper.js", () => ({
  isGuildAdmin: isGuildAdminMock,
}));
vi.mock("../../../src/logger.js", () => ({
  default: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

import { createApp } from "../../../src/http/expressServer.js";

describe("/api/guildChannels/:guildId/user/:userId", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.INTERNAL_API_SECRET;
  });

  function createAppWithClient() {
    const guild = {
      channels: {
        fetch: vi.fn().mockResolvedValue(
          new Map([
            ["c1", { id: "c1", name: "general", type: 0 }],
            ["c2", { id: "c2", name: "voice", type: 2 }],
          ]),
        ),
      },
    };
    const client = {
      guilds: {
        fetch: vi.fn().mockResolvedValue(guild),
      },
    } as any;
    return { app: createApp(client), client };
  }

  it("returns 403 when user is not admin", async () => {
    isGuildAdminMock.mockResolvedValue(false);
    const { app } = createAppWithClient();

    const res = await supertest(app)
      .get("/api/guildChannels/G1/user/U1")
      .expect(403);

    expect(res.body).toEqual({ error: "forbidden" });
  });

  it("returns list of text channels when user is admin", async () => {
    isGuildAdminMock.mockResolvedValue(true);
    const { app } = createAppWithClient();

    const res = await supertest(app)
      .get("/api/guildChannels/G1/user/U1")
      .expect(200);

    expect(res.body).toEqual({
      channels: [{ id: "c1", name: "general" }],
    });
  });

  it("returns 404 when guild not found", async () => {
    isGuildAdminMock.mockResolvedValue(true);
    const client = {
      guilds: {
        fetch: vi.fn().mockResolvedValue(null),
      },
    } as any;
    const app = createApp(client);

    const res = await supertest(app)
      .get("/api/guildChannels/G1/user/U1")
      .expect(404);

    expect(res.body).toEqual({ error: "guild_not_found" });
  });

  it("returns 404 for GET without client", async () => {
    const appNoClient = createApp();

    await supertest(appNoClient)
      .get("/api/guildChannels/G1/user/U1")
      .expect(404);
  });

  it("returns 404 for POST (method not registered)", async () => {
    const { app } = createAppWithClient();

    await supertest(app).post("/api/guildChannels/G1/user/U1").expect(404);
  });
});
