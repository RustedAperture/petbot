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
} from "../../src/utilities/helper.js";
import { ActionData, sequelize } from "../../src/utilities/db.js";

describe("helper util", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
});
