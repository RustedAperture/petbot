import { describe, it, expect, vi, beforeEach } from "vitest";
import supertest from "supertest";

const { selectMock, selectDistinctMock } = vi.hoisted(() => ({
  selectMock: vi.fn(),
  selectDistinctMock: vi.fn(),
}));

vi.mock("../../../src/db/connector.js", () => ({
  drizzleDb: { select: selectMock, selectDistinct: selectDistinctMock },
}));
vi.mock("../../../src/logger.js", () => ({
  default: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

import { createApp } from "../../../src/http/expressServer.js";

function mockSessionGuilds(rows: Array<{ guilds: unknown }>) {
  selectMock.mockImplementation(() => ({
    from: () => ({ where: () => ({ limit: () => Promise.resolve(rows) }) }),
  }));
}

describe("GET /api/guilds/member/:userId", () => {
  let app: ReturnType<typeof createApp>;

  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.INTERNAL_API_SECRET;
    app = createApp();
  });

  it("returns the user's guilds that have any action data, even from other users", async () => {
    mockSessionGuilds([
      { guilds: [{ id: "g1", name: "One" }, { id: "g2", name: "Two" }] },
    ]);
    selectDistinctMock.mockImplementation(() => ({
      from: () => ({ where: () => Promise.resolve([{ locationId: "g2" }]) }),
    }));

    const res = await supertest(app)
      .get("/api/guilds/member/user-1")
      .expect(200);

    expect(res.body).toEqual({ guildIds: ["g2"] });
  });

  it.each([
    ["no session row", []],
    ["a session with no guilds", [{ guilds: [] }]],
  ])("returns no guilds for %s", async (_label, rows) => {
    mockSessionGuilds(rows);

    const res = await supertest(app)
      .get("/api/guilds/member/user-1")
      .expect(200);

    expect(res.body).toEqual({ guildIds: [] });
    expect(selectDistinctMock).not.toHaveBeenCalled();
  });
});
