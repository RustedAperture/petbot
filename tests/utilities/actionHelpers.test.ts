import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../utilities/check_user.js", () => ({ checkUser: vi.fn() }));
vi.mock("../../utilities/db.js", () => ({
  ActionData: {
    findOne: vi.fn(),
  },
}));
vi.mock("../../utilities/helper.js", () => ({ randomImage: vi.fn() }));
vi.mock("../../components/buildActionReply.js", () => ({
  buildActionReply: vi.fn(),
}));
vi.mock("../../components/buildStatsReply.js", () => ({
  buildStatsReply: vi.fn(),
}));

import {
  performAction,
  getActionStatsContainer,
} from "../../utilities/actionHelpers.js";
import { ActionData } from "../../utilities/db.js";
import { randomImage } from "../../utilities/helper.js";
import { buildActionReply } from "../../components/buildActionReply.js";
import { buildStatsReply } from "../../components/buildStatsReply.js";

describe("actionHelpers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("performAction increments counters and returns built reply", async () => {
    const targetRow = {
      get: vi
        .fn()
        .mockImplementation((k: string) => (k === "images" ? ["img"] : 0)),
      increment: vi.fn(),
    };
    const authorRow = {
      get: vi
        .fn()
        .mockImplementation((k: string) => (k === "images" ? ["img"] : 0)),
      increment: vi.fn(),
    };
    (ActionData.findOne as any)
      .mockResolvedValueOnce(targetRow)
      .mockResolvedValueOnce(authorRow);

    (randomImage as any).mockReturnValue("img");
    (buildActionReply as any).mockReturnValue("container");

    const res = await performAction(
      "pet" as any,
      { id: "t" } as any,
      { id: "a" } as any,
      "g1",
    );

    expect(targetRow.increment).toHaveBeenCalledWith("has_received");
    expect(authorRow.increment).toHaveBeenCalledWith("has_performed");
    expect(buildActionReply).toHaveBeenCalled();
    expect(res).toBe("container");
  });

  it("getActionStatsContainer returns built stats reply when row exists", async () => {
    const row = { get: vi.fn().mockReturnValue(["img"]) };
    (ActionData.findOne as any).mockResolvedValue(row);
    (ActionData.sum as any) = vi.fn().mockResolvedValue(7);
    (buildStatsReply as any).mockReturnValue("statsContainer");

    const res = await getActionStatsContainer(
      "pet" as any,
      { id: "t" } as any,
      "g1",
    );
    expect(buildStatsReply).toHaveBeenCalled();
    expect(res).toBe("statsContainer");
  });
});
