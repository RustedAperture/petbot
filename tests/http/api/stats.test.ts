import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@utils/db.js", () => ({
  ActionData: {
    sum: vi.fn(),
    count: vi.fn(),
  },
  BotData: { count: vi.fn() },
}));

import statsHandler from "../../../src/http/api/stats.js";
import { ActionData } from "../../../src/utilities/db.js";

describe("/api/stats handler - DM location presence behavior", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("returns 404 when user has no row for the requested location", async () => {
    // presence check -> 0 rows
    (ActionData.count as any).mockResolvedValueOnce(0);

    const req: any = {
      method: "GET",
      url: "/api/stats?userId=user-1&locationId=loc-99",
      headers: { host: "localhost" },
    };

    const res: any = { writeHead: vi.fn(), end: vi.fn() };

    await statsHandler(req, res);

    expect(res.writeHead).toHaveBeenCalledWith(404, {
      "Content-Type": "application/json",
    });
    expect(res.end).toHaveBeenCalledWith(
      JSON.stringify({ error: "not_found" }),
    );
  });

  it("when user has a row for the location, returns user-scoped aggregates for that location", async () => {
    // presence check -> user present
    (ActionData.count as any)
      .mockResolvedValueOnce(1) // presence
      // per-action distinct-user counts (user-scoped -> should be 1 for actions user performed)
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(0) // explode (user hasn't performed)
      .mockResolvedValueOnce(1) // totalUniqueUsers (user presence -> 1)
      .mockResolvedValueOnce(1); // totalLocations (user present at the requested location)

    // sums for each action kind (these are the user's totals at the location)
    (ActionData.sum as any)
      .mockResolvedValueOnce(10)
      .mockResolvedValueOnce(20)
      .mockResolvedValueOnce(30)
      .mockResolvedValueOnce(40)
      .mockResolvedValueOnce(50)
      .mockResolvedValueOnce(0); // explode sum

    const req: any = {
      method: "GET",
      url: "/api/stats?userId=user-1&locationId=loc-99",
      headers: { host: "localhost" },
    };

    const res: any = { writeHead: vi.fn(), end: vi.fn() };

    await statsHandler(req, res);

    expect(res.writeHead).toHaveBeenCalledWith(200, {
      "Content-Type": "application/json",
    });

    // parse the JSON body written by the handler
    const bodyArg = (res.end as any).mock.calls[0][0];
    const body = JSON.parse(bodyArg);
    console.log("API body:", JSON.stringify(body, null, 2));

    expect(body.totalActionsPerformed).toBe(10 + 20 + 30 + 40 + 50);
    expect(body.totalUniqueUsers).toBe(1);
    expect(body.totalLocations).toBe(1);
    expect(body.totalsByAction.pet.totalHasPerformed).toBe(10);
    expect(body.totalsByAction.bite.totalHasPerformed).toBe(20);
    expect(body.totalsByAction.hug.totalHasPerformed).toBe(30);
  });
});
