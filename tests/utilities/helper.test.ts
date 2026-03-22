import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import type { Client } from "discord.js";

vi.mock("../../src/logger.js", () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock("../../src/db/connector.js", () => ({
  drizzleDb: { select: vi.fn() },
}));
vi.mock("../../src/db/schema.js", () => ({ actionData: {} }));

import {
  hexToRGBTuple,
  randomImage,
  fetchGlobalStats,
  fetchStatsForLocation,
  isGuildAdmin,
} from "../../src/utilities/helper.js";
import type { ActionUser } from "../../src/types/user.js";
import { drizzleDb } from "../../src/db/connector.js";

const selectMock = drizzleDb.select as Mock;
describe("helper util", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("hexToRGBTuple parses hex correctly", () => {
    expect(hexToRGBTuple("#ff0000")).toEqual([255, 0, 0]);
  });

  it("randomImage returns deterministic item when Math.random mocked", () => {
    const restore = vi.spyOn(Math, "random").mockReturnValue(0.9);
    const target: ActionUser = {
      id: 1,
      userId: "test-user",
      locationId: "loc-1",
      actionType: "pet",
      hasPerformed: 1,
      hasReceived: 0,
      images: ["a", "b", "c"],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    expect(randomImage(target)).toBe("c");
    restore.mockRestore();
  });

  it("fetchGlobalStats returns aggregated values", async () => {
    const seq: Array<Record<string, number>>[] = [
      [{ s: 10 }],
      [{ s: 20 }],
      [{ s: 30 }],
      [{ s: 40 }],
      [{ s: 50 }],
      [{ s: 0 }],
      [{ uniqueGuilds: 3 }],
      [{ cnt: 5 }],
      [{ cnt: 6 }],
      [{ cnt: 7 }],
      [{ cnt: 8 }],
      [{ cnt: 9 }],
      [{ cnt: 0 }],
    ];
    let call = 0;
    selectMock.mockImplementation(() => ({
      from: () => ({
        where: () => Promise.resolve(seq[call++] ?? [{ cnt: 0 }]),
        then: (resolve: (value: Array<Record<string, number>>) => void) =>
          resolve(seq[call++] ?? [{ cnt: 0 }]),
      }),
    }));

    const res = await fetchGlobalStats();

    expect(res.totalsByAction.pet.totalHasPerformed).toBe(10);
    expect(res.totalsByAction.bite.totalHasPerformed).toBe(20);
    expect(res.totalsByAction.hug.totalHasPerformed).toBe(30);
    expect(res.totalsByAction.bonk.totalHasPerformed).toBe(40);
    expect(res.totalsByAction.squish.totalHasPerformed).toBe(50);
    expect(res.totalsByAction.explode.totalHasPerformed).toBe(0);
    expect(res.totalLocations).toBe(3);
    expect(res.totalsByAction.pet.totalUsers).toBe(5);
    expect(res.totalsByAction.bite.totalUsers).toBe(6);
    expect(res.totalsByAction.hug.totalUsers).toBe(7);
    expect(res.totalsByAction.bonk.totalUsers).toBe(8);
    expect(res.totalsByAction.squish.totalUsers).toBe(9);
    expect(res.totalsByAction.explode.totalUsers).toBe(0);
  });

  it("fetchGlobalStats handles errors and returns zeros", async () => {
    selectMock.mockImplementation(() => {
      throw new Error("boom");
    });
    const res = await fetchGlobalStats();
    expect(res.totalsByAction.pet.totalHasPerformed).toBe(0);
    expect(res.totalsByAction.bite.totalHasPerformed).toBe(0);
  });

  it("fetchStatsForLocation returns aggregated values for a given location", async () => {
    const seq: Array<Record<string, number>>[] = [
      [{ s: 3 }],
      [{ s: 4 }],
      [{ s: 5 }],
      [{ s: 6 }],
      [{ s: 7 }],
      [{ s: 0 }],
      [{ c: 1 }],
      [{ cnt: 1 }],
      [{ cnt: 2 }],
      [{ cnt: 3 }],
      [{ cnt: 4 }],
      [{ cnt: 5 }],
      [{ cnt: 0 }],
    ];
    let call = 0;
    selectMock.mockImplementation(() => ({
      from: () => ({
        where: () => Promise.resolve(seq[call++] ?? [{ cnt: 0 }]),
        then: (resolve: (value: Array<Record<string, number>>) => void) =>
          resolve(seq[call++] ?? [{ cnt: 0 }]),
      }),
    }));

    const res = await fetchStatsForLocation("guild-99");

    expect(res.totalsByAction.pet.totalHasPerformed).toBe(3);
    expect(res.totalsByAction.bite.totalHasPerformed).toBe(4);
    expect(res.totalsByAction.hug.totalHasPerformed).toBe(5);
    expect(res.totalsByAction.bonk.totalHasPerformed).toBe(6);
    expect(res.totalsByAction.squish.totalHasPerformed).toBe(7);
    expect(res.totalsByAction.explode.totalHasPerformed).toBe(0);
    expect(res.totalLocations).toBe(1);
    expect(res.totalsByAction.pet.totalUsers).toBe(1);
    expect(res.totalsByAction.bite.totalUsers).toBe(2);
    expect(res.totalsByAction.hug.totalUsers).toBe(3);
    expect(res.totalsByAction.bonk.totalUsers).toBe(4);
    expect(res.totalsByAction.squish.totalUsers).toBe(5);
    expect(res.totalsByAction.explode.totalUsers).toBe(0);
  });

  it("fetchStatsForLocation handles errors and returns zeros", async () => {
    selectMock.mockImplementation(() => {
      throw new Error("boom");
    });

    const res = await fetchStatsForLocation("guild-99");

    expect(res.totalsByAction.pet.totalHasPerformed).toBe(0);
    expect(res.totalsByAction.bite.totalHasPerformed).toBe(0);
    expect(res.totalsByAction.pet.totalUsers).toBe(0);
    expect(res.totalLocations).toBe(0);
  });

  interface MockMember {
    permissions: { has: (perm: number) => boolean };
  }

  interface MockGuild {
    ownerId: string;
    members: { fetch: () => Promise<MockMember | null> };
  }

  it("isGuildAdmin returns false for unknown guild", async () => {
    const client = {
      guilds: { fetch: vi.fn().mockRejectedValue(new Error("UnknownGuild")) },
    } as unknown as Client<boolean>;

    await expect(isGuildAdmin(client, "guild-99", "user-1")).resolves.toBe(
      false,
    );
  });

  it("isGuildAdmin returns false for missing member", async () => {
    const mockGuild: MockGuild = {
      ownerId: "owner-1",
      members: { fetch: vi.fn().mockResolvedValue(null) },
    };

    const client = {
      guilds: { fetch: vi.fn().mockResolvedValue(mockGuild) },
    } as unknown as Client<boolean>;

    await expect(isGuildAdmin(client, "guild-99", "user-1")).resolves.toBe(
      false,
    );
  });

  it("isGuildAdmin returns false for non-admin non-owner", async () => {
    const mockMember: MockMember = {
      permissions: { has: vi.fn().mockReturnValue(false) },
    };

    const mockGuild: MockGuild = {
      ownerId: "owner-1",
      members: { fetch: vi.fn().mockResolvedValue(mockMember) },
    };

    const client = {
      guilds: { fetch: vi.fn().mockResolvedValue(mockGuild) },
    } as unknown as Client<boolean>;

    await expect(isGuildAdmin(client, "guild-99", "user-1")).resolves.toBe(
      false,
    );
  });

  it("isGuildAdmin returns true when member has Administrator permission", async () => {
    const mockMember: MockMember = {
      permissions: { has: vi.fn().mockReturnValue(true) },
    };

    const mockGuild: MockGuild = {
      ownerId: "owner-1",
      members: { fetch: vi.fn().mockResolvedValue(mockMember) },
    };

    const client = {
      guilds: { fetch: vi.fn().mockResolvedValue(mockGuild) },
    } as unknown as Client<boolean>;

    await expect(isGuildAdmin(client, "guild-99", "user-1")).resolves.toBe(
      true,
    );
  });

  it("isGuildAdmin returns true for owner", async () => {
    const mockMember: MockMember = {
      permissions: { has: vi.fn().mockReturnValue(false) },
    };

    const mockGuild: MockGuild = {
      ownerId: "owner-1",
      members: { fetch: vi.fn().mockResolvedValue(mockMember) },
    };

    const client = {
      guilds: { fetch: vi.fn().mockResolvedValue(mockGuild) },
    } as unknown as Client<boolean>;

    await expect(isGuildAdmin(client, "guild-99", "owner-1")).resolves.toBe(
      true,
    );
  });
});
