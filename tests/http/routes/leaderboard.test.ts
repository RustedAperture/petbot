import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../../src/utilities/leaderboard.js", () => ({
  getLeaderboard: vi.fn(),
}));

vi.mock("../../../src/logger.js", () => ({ default: { error: vi.fn() } }));

import leaderboardHandler from "../../../src/http/routes/leaderboard.js";
import { getLeaderboard } from "../../../src/utilities/leaderboard.js";

const mockClient = {} as any;

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

  it("returns 400 for invalid actionType", async () => {
    const handler = leaderboardHandler(mockClient);
    const req = { query: { locationId: "g1", actionType: "invalid" } } as any;
    const res = makeRes();
    await handler(req, res);
    expect(res._status).toBe(400);
  });

  it("returns global leaderboard when no locationId", async () => {
    (getLeaderboard as any).mockResolvedValue({
      locationId: null,
      actionType: null,
      entries: [
        { rank: 1, userId: "u1", displayName: null, anonymousLabel: "abcd", totalActions: 100 },
      ],
    });

    const handler = leaderboardHandler(mockClient);
    const req = { query: {} } as any;
    const res = makeRes();
    await handler(req, res);

    expect(getLeaderboard).toHaveBeenCalledWith(
      expect.not.objectContaining({ locationId: expect.anything() }),
    );
    expect(res._body.entries).toHaveLength(1);
  });

  it("returns leaderboard data for a specific location", async () => {
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

    const handler = leaderboardHandler(mockClient);
    const req = {
      query: { locationId: "g1" },
    } as any;
    const res = makeRes();
    await handler(req, res);

    expect(getLeaderboard).toHaveBeenCalledWith(
      expect.objectContaining({ locationId: "g1" }),
    );
    expect(res._body.entries).toHaveLength(1);
    expect(res._body.entries[0].rank).toBe(1);
  });

  it("caps limit at 25", async () => {
    (getLeaderboard as any).mockResolvedValue({
      locationId: "g1",
      actionType: null,
      entries: [],
    });

    const handler = leaderboardHandler(mockClient);
    const req = {
      query: { locationId: "g1", limit: "100" },
    } as any;
    const res = makeRes();
    await handler(req, res);

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

    const handler = leaderboardHandler(mockClient);
    const req = {
      query: { locationId: "g1" },
    } as any;
    const res = makeRes();
    await handler(req, res);

    expect(getLeaderboard).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 10 }),
    );
  });
});
