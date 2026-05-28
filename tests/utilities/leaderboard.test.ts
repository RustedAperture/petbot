import { describe, it, expect, vi, beforeEach } from "vitest";

const { sumMock } = vi.hoisted(() => ({
  sumMock: vi.fn(),
}));

vi.mock("../../src/db/connector.js", () => ({
  drizzleDb: {
    select: vi.fn(),
  },
}));

vi.mock("../../src/db/schema.js", () => ({
  actionData: {
    userId: "userId",
    locationId: "locationId",
    actionType: "actionType",
    hasPerformed: "hasPerformed",
  },
}));

vi.mock("drizzle-orm", () => ({
  sql: { raw: (s: string) => s },
  eq: vi.fn((a, b) => ({ type: "eq", a, b })),
  and: vi.fn((...args: unknown[]) => args),
  desc: vi.fn((col) => ({ type: "desc", col })),
  sum: sumMock,
  gt: vi.fn((a, b) => ({ type: "gt", a, b })),
}));

vi.mock("../../src/logger.js", () => ({ default: { error: vi.fn() } }));

import { getLeaderboard } from "../../src/utilities/leaderboard.js";
import { drizzleDb } from "../../src/db/connector.js";

describe("getLeaderboard", () => {
  function makeChain(resolvedRows: any[]) {
    const chain: any = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      groupBy: vi.fn().mockReturnThis(),
      having: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue(resolvedRows),
    };
    return chain;
  }

  const noGuildClient = {
    guilds: {
      cache: new Map(),
      fetch: vi.fn().mockRejectedValue(new Error("not in guild")),
    },
  } as any;

  beforeEach(() => {
    vi.clearAllMocks();
    sumMock.mockReturnValue({ mapWith: () => "sum_hasPerformed" });
  });

  it("returns empty entries when no data exists", async () => {
    (drizzleDb.select as any).mockReturnValue(makeChain([]));

    const result = await getLeaderboard({
      locationId: "guild-1",
      discordClient: noGuildClient,
    });

    expect(result.locationId).toBe("guild-1");
    expect(result.actionType).toBeNull();
    expect(result.entries).toEqual([]);
  });

  it("returns ranked entries with anonymous labels when bot not in guild", async () => {
    (drizzleDb.select as any).mockReturnValue(
      makeChain([
        { userId: "user-1", totalActions: 100 },
        { userId: "user-2", totalActions: 50 },
      ]),
    );

    const result = await getLeaderboard({
      locationId: "guild-1",
      discordClient: noGuildClient,
    });

    expect(result.entries).toHaveLength(2);
    expect(result.entries[0].rank).toBe(1);
    expect(result.entries[0].userId).toBe("user-1");
    expect(result.entries[0].displayName).toBeNull();
    expect(result.entries[0].anonymousLabel).toHaveLength(4);
    expect(result.entries[1].rank).toBe(2);
  });

  it("filters by actionType when provided", async () => {
    (drizzleDb.select as any).mockReturnValue(
      makeChain([{ userId: "user-1", totalActions: 20 }]),
    );

    const result = await getLeaderboard({
      locationId: "guild-1",
      actionType: "pet",
      discordClient: noGuildClient,
    });

    expect(result.actionType).toBe("pet");
    expect(result.entries).toHaveLength(1);
    expect(result.entries[0].totalActions).toBe(20);
  });

  it("respects the limit parameter", async () => {
    const chain = makeChain([]);
    (drizzleDb.select as any).mockReturnValue(chain);

    await getLeaderboard({
      locationId: "guild-1",
      limit: 5,
      discordClient: noGuildClient,
    });

    expect(chain.limit).toHaveBeenCalledWith(5);
  });

  it("caps limit at 25", async () => {
    const chain = makeChain([]);
    (drizzleDb.select as any).mockReturnValue(chain);

    await getLeaderboard({
      locationId: "guild-1",
      limit: 100,
      discordClient: noGuildClient,
    });

    expect(chain.limit).toHaveBeenCalledWith(25);
  });

  it("defaults limit to 10", async () => {
    const chain = makeChain([]);
    (drizzleDb.select as any).mockReturnValue(chain);

    await getLeaderboard({
      locationId: "guild-1",
      discordClient: noGuildClient,
    });

    expect(chain.limit).toHaveBeenCalledWith(10);
  });

  it("does not fetch display names when guild fetch fails", async () => {
    const guildFetch = vi.fn().mockRejectedValue(new Error("not in guild"));
    const client = {
      guilds: { cache: new Map(), fetch: guildFetch },
    } as any;

    (drizzleDb.select as any).mockReturnValue(
      makeChain([
        { userId: "user-1", totalActions: 100 },
        { userId: "user-2", totalActions: 50 },
      ]),
    );

    const result = await getLeaderboard({
      locationId: "guild-1",
      discordClient: client,
    });

    expect(guildFetch).toHaveBeenCalledWith("guild-1");
    expect(result.entries[0].displayName).toBeNull();
    expect(result.entries[1].displayName).toBeNull();
  });

  it("uses display name when guild fetch succeeds", async () => {
    const guildFetch = vi.fn().mockResolvedValue({
      members: {
        fetch: vi.fn().mockResolvedValue(
          new Map([
            [
              "user-1",
              {
                displayName: "CoolDude",
                user: { displayName: "notused" },
              },
            ],
          ]),
        ),
      },
    });
    const client = {
      guilds: { cache: new Map(), fetch: guildFetch },
    } as any;

    (drizzleDb.select as any).mockReturnValue(
      makeChain([{ userId: "user-1", totalActions: 100 }]),
    );

    const result = await getLeaderboard({
      locationId: "guild-1",
      discordClient: client,
    });

    expect(result.entries[0].displayName).toBe("CoolDude");
  });

  it("falls back to user.displayName when member.displayName is missing", async () => {
    const guildFetch = vi.fn().mockResolvedValue({
      members: {
        fetch: vi.fn().mockResolvedValue(
          new Map([
            [
              "user-1",
              {
                displayName: null,
                user: { displayName: "FallbackName" },
              },
            ],
          ]),
        ),
      },
    });
    const client = {
      guilds: { cache: new Map(), fetch: guildFetch },
    } as any;

    (drizzleDb.select as any).mockReturnValue(
      makeChain([{ userId: "user-1", totalActions: 100 }]),
    );

    const result = await getLeaderboard({
      locationId: "guild-1",
      discordClient: client,
    });

    expect(result.entries[0].displayName).toBe("FallbackName");
  });

  it("works without locationId for global scope", async () => {
    (drizzleDb.select as any).mockReturnValue(
      makeChain([
        { userId: "user-1", totalActions: 200 },
        { userId: "user-2", totalActions: 150 },
      ]),
    );

    const result = await getLeaderboard({
      discordClient: noGuildClient,
    });

    expect(result.locationId).toBeNull();
    expect(result.entries).toHaveLength(2);
    expect(result.entries[0].totalActions).toBe(200);
    // No guild to resolve names from, so all entries are anonymous
    expect(result.entries[0].displayName).toBeNull();
    expect(result.entries[0].anonymousLabel).toHaveLength(4);
  });
});
