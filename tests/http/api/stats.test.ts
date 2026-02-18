import { describe, it, expect, vi, beforeEach } from "vitest";

const { selectMock } = vi.hoisted(() => ({
  selectMock: vi.fn(),
}));

vi.mock("../../../src/db/connector.js", () => ({
  drizzleDb: { select: selectMock },
}));
vi.mock("../../../src/db/schema.js", () => ({
  actionData: {
    actionType: Symbol("action_type"),
    hasPerformed: Symbol("has_performed"),
    userId: Symbol("user_id"),
    locationId: Symbol("location_id"),
  },
  botData: {},
}));

import statsHandler from "../../../src/http/api/stats.js";

describe("/api/stats handler - DM location presence behavior", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("returns 404 when user has no row for the requested location", async () => {
    // presence check -> 0 rows
    (selectMock as any).mockImplementationOnce(() => ({
      from: () => ({ where: () => Promise.resolve([{ c: 0 }]) }),
    }));

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
    // Prepare a sequence of results matching the drizzleDb.select calls made by
    // the handler for a user+location filtered request.
    const seq: any[] = [
      [{ c: 1 }], // presence check
      [{ s: 10 }], // pet sum
      [{ s: 20 }], // bite sum
      [{ s: 30 }], // hug sum
      [{ s: 40 }], // bonk sum
      [{ s: 50 }], // squish sum
      [{ s: 0 }], // explode sum
      [{ cnt: 1 }], // pet distinct users
      [{ cnt: 1 }], // bite
      [{ cnt: 1 }], // hug
      [{ cnt: 1 }], // bonk
      [{ cnt: 1 }], // squish
      [{ cnt: 0 }], // explode
      [{ c: 1 }], // totalUniqueUsers (user presence -> 1)
      [{ c: 1 }], // totalLocations (user present at the requested location)
    ];

    let call = 0;
    (selectMock as any).mockImplementation(() => ({
      from: () => ({ where: () => Promise.resolve(seq[call++] || [{ c: 0 }]) }),
    }));

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
