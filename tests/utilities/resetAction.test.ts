import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock DB & logger modules
vi.mock("../../utilities/db.js", () => ({
  ActionData: {
    findOne: vi.fn(),
    findAll: vi.fn(),
    update: vi.fn(),
  },
  BotData: { findOne: vi.fn() },
}));
vi.mock("../../utilities/log.js", () => ({ log: vi.fn() }));
vi.mock("../../logger.js", () => ({
  default: { debug: vi.fn(), error: vi.fn() },
}));

import { resetAction } from "../../utilities/resetAction.js";
import { ActionData, BotData } from "../../utilities/db.js";

describe("resetAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("resets slot 1 to guild base image for a single record", async () => {
    const mockRecord = {
      get: vi
        .fn()
        .mockImplementation((k: string) =>
          k === "images" ? ["old1", "old2"] : 1,
        ),
    };
    (ActionData.findOne as any).mockResolvedValue(mockRecord);
    (BotData.findOne as any).mockResolvedValue({
      get: vi.fn().mockReturnValue("guild-base.png"),
    });

    const interaction = {
      context: 0,
      guild: { name: "G", channels: { fetch: vi.fn().mockResolvedValue({}) } },
      guildId: "g1",
      channelId: "c1",
      user: { id: "u1", username: "u", displayName: "User" },
    } as any;

    await resetAction("pet" as any, interaction, "u1", 1, false);

    expect(ActionData.update).toHaveBeenCalledWith(
      { images: ["guild-base.png", "old2"] },
      expect.any(Object),
    );
  });

  it("resets slot everywhere when everywhere is true", async () => {
    const record1 = {
      get: vi
        .fn()
        .mockImplementation((k: string) => (k === "images" ? ["a", "b"] : 1)),
    };
    const record2 = {
      get: vi
        .fn()
        .mockImplementation((k: string) => (k === "images" ? ["x", "y"] : 2)),
    };
    (ActionData.findAll as any).mockResolvedValue([record1, record2]);
    (BotData.findOne as any).mockResolvedValue({
      get: vi.fn().mockReturnValue("guild-base.png"),
    });

    const interaction = {
      context: 0,
      guild: { channels: { fetch: vi.fn().mockResolvedValue({}) } },
      guildId: "g1",
      channelId: "c1",
      user: { id: "u1", username: "u", displayName: "User" },
    } as any;

    await resetAction("pet" as any, interaction, "u1", 1, true);

    // Verify images updated for each record (slot 1 set to guild base image) and correct record ids
    expect(ActionData.update).toHaveBeenNthCalledWith(
      1,
      { images: ["guild-base.png", "b"] },
      { where: { id: 1 } },
    );
    expect(ActionData.update).toHaveBeenNthCalledWith(
      2,
      { images: ["guild-base.png", "y"] },
      { where: { id: 2 } },
    );
  });

  it("logs error and returns when no per-location record exists", async () => {
    (ActionData.findOne as any).mockResolvedValue(null);
    const interaction = {
      context: 0,
      guild: { channels: { fetch: vi.fn().mockResolvedValue({}) } },
      guildId: "g1",
      channelId: "c1",
      user: { id: "u1", username: "u", displayName: "User" },
    } as any;

    await resetAction("pet" as any, interaction, "u1", 1, false);

    const { default: logger } = await import("../../logger.js");
    expect(logger.error).toHaveBeenCalled();
    expect(ActionData.update).not.toHaveBeenCalled();
  });
});
