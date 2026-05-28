import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../../src/utilities/leaderboard.js", () => ({
  getLeaderboard: vi.fn(),
}));

vi.mock("../../../src/logger.js", () => ({ default: { error: vi.fn() } }));

import leaderboardHandler from "../../../src/http/routes/leaderboard.js";
import { getLeaderboard } from "../../../src/utilities/leaderboard.js";

function makeRes() {
  const res: any = {};
  res._status = 200;
  res._body = undefined;
  res.status = vi.fn((code: number) => {
    res._status = code;
    return res;
  });
  res.json = vi.fn((body: any) => {
    res._body = body;
    return res;
  });
  return res;
}

describe("GET /api/leaderboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 when locationId is missing", async () => {
    const req = { query: {} } as any;
    const res = makeRes();
    await leaderboardHandler(req, res);
    expect(res._status).toBe(400);
    expect(res._body.error).toBe("missing_locationId");
  });

  it("returns 400 for invalid actionType", async () => {
    const req = { query: { locationId: "g1", actionType: "invalid" } } as any;
    const res = makeRes();
    await leaderboardHandler(req, res);
    expect(res._status).toBe(400);
  });

  it("returns 503 when client is missing", async () => {
    const req = {
      query: { locationId: "g1" },
      app: { locals: {} },
    } as any;
    const res = makeRes();
    await leaderboardHandler(req, res);
    expect(res._status).toBe(503);
  });

  it("returns leaderboard data on success", async () => {
    (getLeaderboard as any).mockResolvedValue({
      locationId: "g1",
      actionType: null,
      entries: [
        {
          rank: 1,
          userId: "u1",
          displayName: null,
          anonymousLabel: "abcd",
          totalActions: 42,
        },
      ],
    });

    const req = {
      query: { locationId: "g1" },
      app: { locals: { client: {} } },
    } as any;
    const res = makeRes();
    await leaderboardHandler(req, res);

    expect(res._body.entries).toHaveLength(1);
    expect(res._body.entries[0].rank).toBe(1);
  });

  it("caps limit at 25", async () => {
    (getLeaderboard as any).mockResolvedValue({
      locationId: "g1",
      actionType: null,
      entries: [],
    });

    const req = {
      query: { locationId: "g1", limit: "100" },
      app: { locals: { client: {} } },
    } as any;
    const res = makeRes();
    await leaderboardHandler(req, res);

    expect(getLeaderboard).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 25 }),
    );
  });

  it("defaults limit to 10", async () => {
    (getLeaderboard as any).mockResolvedValue({
      locationId: "g1",
      actionType: null,
      entries: [],
    });

    const req = {
      query: { locationId: "g1" },
      app: { locals: { client: {} } },
    } as any;
    const res = makeRes();
    await leaderboardHandler(req, res);

    expect(getLeaderboard).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 10 }),
    );
  });
});
