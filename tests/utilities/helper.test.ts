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
  canManageServer,
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
});

describe("canManageServer", () => {
  const fetchMember = vi.fn();
  function clientWith(ownerId: string, perms: string[] | null) {
    const member = perms
      ? { permissions: { has: (p: any) => [p].flat().some((x) => perms.includes(String(x))) } }
      : null;
    return {
      guilds: {
        fetch: async () => ({
          ownerId,
          members: {
            fetch: async (arg: unknown) => {
              fetchMember(arg);
              return member ?? Promise.reject(new Error("x"));
            },
          },
        }),
      },
    } as unknown as Client;
  }
  const MANAGE_GUILD = String(32n);
  const ADMINISTRATOR = String(8n);

  it.each([
    ["the owner", "u1", null, true],
    ["Manage Server only", "owner", [MANAGE_GUILD], true],
    ["Administrator only", "owner", [ADMINISTRATOR], true],
    ["neither permission", "owner", [], false],
    ["a non-member", "owner", null, false],
  ])("%s", async (_label, ownerId, perms, expected) => {
    expect(await canManageServer(clientWith(ownerId, perms), "g", "u1")).toBe(expected);
  });

  it("bypasses the member cache", async () => {
    await canManageServer(clientWith("owner", [MANAGE_GUILD]), "g", "u1");
    expect(fetchMember).toHaveBeenCalledWith({ user: "u1", force: true });
  });
});
