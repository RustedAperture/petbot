import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock DB & logger modules
vi.mock("@utils/db.js", () => ({
  ActionData: {
    findOne: vi.fn(),
    findAll: vi.fn(),
    update: vi.fn(),
  },
  BotData: { findOne: vi.fn() },
}));
vi.mock("@utils/log.js", () => ({ log: vi.fn() }));
vi.mock("@logger", () => ({
  default: { debug: vi.fn(), error: vi.fn() },
}));

import { updateAction } from "@utils/updateAction.js";
import { ActionData, BotData } from "@utils/db.js";

describe("updateAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("updates the slot for a single record (per-location)", async () => {
    const mockRecord = {
      get: vi
        .fn()
        .mockImplementation((k: string) =>
          k === "images" ? ["old1", "old2"] : 1,
        ),
    };
    (ActionData.findOne as any).mockResolvedValue(mockRecord);

    const interaction = {
      context: 0,
      commandName: "set-pet",
      guild: { name: "G" },
      guildId: "g1",
      channelId: "c1",
      user: { id: "u1", username: "u", displayName: "User" },
      editReply: vi.fn().mockResolvedValue({}),
    } as any;

    await updateAction(
      "pet" as any,
      interaction,
      "u1",
      "new-url",
      false,
      null,
      1,
    );

    expect(ActionData.update).toHaveBeenCalledWith(
      { images: ["new-url", "old2"] },
      { where: { id: 1 } },
    );
  });

  it("updates the slot for all records when everywhere is true", async () => {
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

    const interaction = {
      context: 0,
      guild: { name: "G" },
      guildId: "g1",
      channelId: "c1",
      user: { id: "u1", username: "u", displayName: "User" },
      editReply: vi.fn().mockResolvedValue({}),
    } as any;

    await updateAction(
      "pet" as any,
      interaction,
      "u1",
      "everywhere-url",
      true,
      null,
      2,
    );

    expect(ActionData.update).toHaveBeenNthCalledWith(
      1,
      { images: ["a", "everywhere-url"] },
      { where: { id: 1 } },
    );
    expect(ActionData.update).toHaveBeenNthCalledWith(
      2,
      { images: ["x", "everywhere-url"] },
      { where: { id: 2 } },
    );
  });

  it("edits reply with personal message for change-<action> command", async () => {
    const mockRecord = {
      get: vi
        .fn()
        .mockImplementation((k: string) => (k === "images" ? ["old"] : 1)),
    };
    (ActionData.findOne as any).mockResolvedValue(mockRecord);

    const interaction = {
      context: 0,
      commandName: "change-pet",
      guild: { name: "G" },
      guildId: "g1",
      channelId: "c1",
      user: { id: "u1", username: "u", displayName: "User" },
      editReply: vi.fn().mockResolvedValue({}),
    } as any;

    await updateAction(
      "pet" as any,
      interaction,
      "u1",
      "new-url",
      false,
      "reason",
      1,
    );

    expect(interaction.editReply).toHaveBeenCalledWith({
      content: "Updated your image to the new url",
      flags: expect.any(Number),
    });
  });
});
