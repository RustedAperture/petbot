import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@utils/db.js", () => ({
  ActionData: {
    sum: vi.fn(),
    count: vi.fn(),
  },
  sequelize: { query: vi.fn() },
}));

import {
  hexToRGBTuple,
  randomImage,
  fetchGlobalStats,
  fetchStatsForLocation,
} from "../../src/utilities/helper.js";
import { ActionData, sequelize } from "../../src/utilities/db.js";

describe("helper util", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("hexToRGBTuple parses hex correctly", () => {
    expect(hexToRGBTuple("#ff0000")).toEqual([255, 0, 0]);
  });

  it("randomImage returns deterministic item when Math.random mocked", () => {
    const restore = vi.spyOn(Math, "random").mockReturnValue(0.9);
    const target = { images: ["a", "b", "c"] } as any;
    expect(randomImage(target)).toBe("c");
    restore.mockRestore();
  });

  it("fetchGlobalStats returns aggregated values", async () => {
    (ActionData.sum as any)
      .mockResolvedValueOnce(10)
      .mockResolvedValueOnce(20)
      .mockResolvedValueOnce(30)
      .mockResolvedValueOnce(40)
      .mockResolvedValueOnce(50);
    (sequelize.query as any).mockResolvedValue([{ uniqueGuilds: 3 }]);
    (ActionData.count as any)
      .mockResolvedValueOnce(5)
      .mockResolvedValueOnce(6)
      .mockResolvedValueOnce(7)
      .mockResolvedValueOnce(8)
      .mockResolvedValueOnce(9);

    const res = await fetchGlobalStats();

    expect(res.totalsByAction.pet.totalHasPerformed).toBe(10);
    expect(res.totalsByAction.bite.totalHasPerformed).toBe(20);
    expect(res.totalsByAction.hug.totalHasPerformed).toBe(30);
    expect(res.totalsByAction.bonk.totalHasPerformed).toBe(40);
    expect(res.totalsByAction.squish.totalHasPerformed).toBe(50);
    expect(res.totalLocations).toBe(3);
    expect(res.totalsByAction.pet.totalUsers).toBe(5);
    expect(res.totalsByAction.bite.totalUsers).toBe(6);
    expect(res.totalsByAction.hug.totalUsers).toBe(7);
    expect(res.totalsByAction.bonk.totalUsers).toBe(8);
    expect(res.totalsByAction.squish.totalUsers).toBe(9);
  });

  it("fetchGlobalStats handles errors and returns zeros", async () => {
    (ActionData.sum as any).mockImplementation(() => {
      throw new Error("boom");
    });
    const res = await fetchGlobalStats();
    expect(res.totalsByAction.pet.totalHasPerformed).toBe(0);
    expect(res.totalsByAction.bite.totalHasPerformed).toBe(0);
  });

  it("fetchStatsForLocation returns aggregated values for a given location", async () => {
    (ActionData.sum as any)
      .mockResolvedValueOnce(3)
      .mockResolvedValueOnce(4)
      .mockResolvedValueOnce(5)
      .mockResolvedValueOnce(6)
      .mockResolvedValueOnce(7);
    (sequelize.query as any).mockResolvedValue([{ uniqueGuilds: 1 }]);
    (ActionData.count as any)
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(2)
      .mockResolvedValueOnce(3)
      .mockResolvedValueOnce(4)
      .mockResolvedValueOnce(5);

    const res = await fetchStatsForLocation("guild-99");

    expect(res.totalsByAction.pet.totalHasPerformed).toBe(3);
    expect(res.totalsByAction.bite.totalHasPerformed).toBe(4);
    expect(res.totalsByAction.hug.totalHasPerformed).toBe(5);
    expect(res.totalsByAction.bonk.totalHasPerformed).toBe(6);
    expect(res.totalsByAction.squish.totalHasPerformed).toBe(7);
    expect(res.totalLocations).toBe(1);
    expect(res.totalsByAction.pet.totalUsers).toBe(1);
    expect(res.totalsByAction.bite.totalUsers).toBe(2);
    expect(res.totalsByAction.hug.totalUsers).toBe(3);
    expect(res.totalsByAction.bonk.totalUsers).toBe(4);
    expect(res.totalsByAction.squish.totalUsers).toBe(5);
  });

  it("fetchStatsForLocation handles errors and returns zeros", async () => {
    (ActionData.sum as any).mockImplementation(() => {
      throw new Error("boom");
    });

    const res = await fetchStatsForLocation("guild-99");

    expect(res.totalsByAction.pet.totalHasPerformed).toBe(0);
    expect(res.totalsByAction.bite.totalHasPerformed).toBe(0);
    expect(res.totalsByAction.pet.totalUsers).toBe(0);
    expect(res.totalLocations).toBe(0);
  });
});
