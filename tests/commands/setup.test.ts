import { vi, describe, it, expect, beforeEach } from "vitest";
import { mockInteraction } from "../helpers/mockInteraction.js";

vi.mock("../../src/utilities/db", () => ({
  BotData: { findOne: vi.fn(), create: vi.fn(), update: vi.fn() },
}));

import { BotData } from "../../src/utilities/db.js";
import { command } from "../../src/commands/slash/serverSetup.js";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("/setup command", () => {
  it("creates guild settings when none exist and replies with fallback (no log channel)", async () => {
    (BotData.findOne as any).mockResolvedValue(null);
    (BotData.create as any).mockResolvedValue({});
    (BotData.update as any).mockResolvedValue([1]);

    const interaction = mockInteraction({
      options: {
        nickname: "bot",
        default_pet: "http://example/a.png",
        default_bite: null,
        sleep_image: null,
        default_bonk: null,
        default_squish: null,
      },
      fetchMember: { setNickname: vi.fn() },
    });

    await command.execute(interaction as any);

    expect(BotData.create as any).toHaveBeenCalled();
    expect(interaction.__calls.replies.length).toBe(1);
    expect(interaction.__calls.replies[0].content).toBe(
      "No log channel has been set yet.",
    );
  });

  it("replies and logs when log channel exists and send succeeds", async () => {
    (BotData.findOne as any).mockResolvedValue({ get: () => "channel-1" });
    (BotData.update as any).mockResolvedValue([1]);

    const fakeLog = { id: "channel-1", send: vi.fn() };
    const interaction = mockInteraction({
      options: {
        nickname: null,
        default_pet: null,
        default_bite: null,
        sleep_image: null,
        default_bonk: null,
        default_squish: null,
      },
      fetchChannel: fakeLog,
      fetchMember: { setNickname: vi.fn() },
    });

    await command.execute(interaction as any);

    expect(BotData.create as any).not.toHaveBeenCalled();
    expect(fakeLog.send).toHaveBeenCalled();
    expect(interaction.__calls.replies.length).toBe(1);
    expect(interaction.__calls.replies[0].content).toBe(
      "Updated Configs. This has been logged.",
    );
  });

  it("replies with fallback when log channel not set or send fails", async () => {
    (BotData.findOne as any).mockResolvedValue({
      get: () => "non-existent-channel",
    });
    (BotData.update as any).mockResolvedValue([0]);

    const interaction = mockInteraction({
      options: {
        nickname: null,
        default_pet: null,
        default_bite: null,
        sleep_image: null,
        default_bonk: null,
        default_squish: null,
      },
      fetchChannel: null,
    });

    await command.execute(interaction as any);

    expect(interaction.__calls.replies.length).toBe(1);
    expect(interaction.__calls.replies[0].content).toBe(
      "No log channel has been set yet.",
    );
  });
});
