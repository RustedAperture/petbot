import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../utilities/db.js", () => ({
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
} from "../../utilities/helper.js";
import { ActionData, sequelize } from "../../utilities/db.js";

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
    (ActionData.sum as any).mockResolvedValueOnce(10).mockResolvedValueOnce(20);
    (sequelize.query as any).mockResolvedValue([{ uniqueGuilds: 3 }]);
    (ActionData.count as any).mockResolvedValueOnce(5).mockResolvedValueOnce(6);

    const res = await fetchGlobalStats();
    expect(res.totalHasPet).toBe(10);
    expect(res.totalHasBitten).toBe(20);
    expect(res.totalLocations).toBe(3);
    expect(res.totalPetUsers).toBe(5);
    expect(res.totalBiteUsers).toBe(6);
  });

  it("fetchGlobalStats handles errors and returns zeros", async () => {
    (ActionData.sum as any).mockImplementation(() => {
      throw new Error("boom");
    });
    const res = await fetchGlobalStats();
    expect(res.totalHasPet).toBe(0);
    expect(res.totalHasBitten).toBe(0);
  });
});
