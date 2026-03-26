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

import statsHandler from "../../../src/http/routes/stats.js";

function makeRes() {
  const res: any = {};
  res.status = vi.fn(() => res);
  res.json = vi.fn((body: unknown) => {
    res._body = body;
    return res;
  });
  return res;
}

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
      params: { userId: "user-1", guildId: "loc-99" },
    };

    const res = makeRes();

    await statsHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: "not_found" });
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
      // consolidated image query returns multiple rows at once
      [
        { actionType: "pet", images: ["u1"] },
        { actionType: "bite", images: ["u2"] },
        { actionType: "hug", images: [] },
        { actionType: "bonk", images: ["i1"] },
        { actionType: "squish", images: [] },
        { actionType: "explode", images: [] },
      ],
      [{ c: 1 }], // totalUniqueUsers (user presence -> 1)
      [{ c: 1 }], // totalLocations (user present at the requested location)
    ];

    let call = 0;
    (selectMock as any).mockImplementation(() => ({
      from: () => ({ where: () => Promise.resolve(seq[call++] || [{ c: 0 }]) }),
    }));

    const req: any = {
      params: { userId: "user-1", guildId: "loc-99" },
    };

    const res = makeRes();

    await statsHandler(req, res);

    expect(res.json).toHaveBeenCalled();
    const body = res._body;

    expect(body.totalActionsPerformed).toBe(10 + 20 + 30 + 40 + 50);
    expect(body.totalUniqueUsers).toBe(1);
    expect(body.totalLocations).toBe(1);
    expect(body.totalsByAction.pet.totalHasPerformed).toBe(10);
    expect(body.totalsByAction.bite.totalHasPerformed).toBe(20);
    expect(body.totalsByAction.hug.totalHasPerformed).toBe(30);

    // images column should be returned when both user and guild are supplied
    expect(body.totalsByAction.pet.images).toEqual(["u1"]);
    expect(body.totalsByAction.bite.images).toEqual(["u2"]);
    expect(body.totalsByAction.hug.images).toEqual([]);
    expect(body.totalsByAction.bonk.images).toEqual(["i1"]);
    expect(body.totalsByAction.squish.images).toEqual([]);
    expect(body.totalsByAction.explode.images).toEqual([]);
  });
});
