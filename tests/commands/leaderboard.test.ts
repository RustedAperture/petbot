import { vi, describe, it, expect, beforeEach } from "vitest";
import { mockInteraction } from "../helpers/mockInteraction.js";

vi.mock("../../src/utilities/leaderboard.js", () => ({
  getLeaderboard: vi.fn(),
}));

import { command } from "../../src/commands/slash/leaderboard.js";
import { getLeaderboard } from "../../src/utilities/leaderboard.js";

describe("/leaderboard command", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns message when no entries", async () => {
    (getLeaderboard as any).mockResolvedValue({
      locationId: "guild-1",
      actionType: null,
      entries: [],
    });

    const interaction = mockInteraction({ guildId: "guild-1" });
    await command.execute(interaction as any);

    expect(interaction.__calls.editedReplies).toHaveLength(1);
    expect(interaction.__calls.editedReplies[0]).toBe(
      "No actions recorded here yet.",
    );
  });

  it("returns ephemeral embed with entries", async () => {
    const entries = Array.from({ length: 3 }, (_, i) => ({
      rank: i + 1,
      userId: `user-${i + 1}`,
      displayName: i === 0 ? "CoolDude" : null,
      anonymousLabel: "abcd",
      totalActions: 100 - i * 10,
    }));

    (getLeaderboard as any).mockResolvedValue({
      locationId: "guild-1",
      actionType: null,
      entries,
    });

    const interaction = mockInteraction({
      guildId: "guild-1",
      user: { id: "user-1" },
    });
    await command.execute(interaction as any);

    expect(interaction.__calls.editedReplies).toHaveLength(1);
    const payload = interaction.__calls.editedReplies[0];
    expect(payload.embeds).toHaveLength(1);
    expect(payload.embeds[0].data.description).toContain("CoolDude");
    expect(payload.embeds[0].data.description).toContain("(you)");
  });

  it("uses channelId when guildId is null (DM context)", async () => {
    (getLeaderboard as any).mockResolvedValue({
      locationId: "dm-123",
      actionType: null,
      entries: [],
    });

    const interaction = mockInteraction({ channelId: "dm-123" });
    interaction.guildId = null;
    await command.execute(interaction as any);

    expect(getLeaderboard).toHaveBeenCalledWith(
      expect.objectContaining({ locationId: "dm-123" }),
    );
  });

  it("passes actionType option when provided", async () => {
    (getLeaderboard as any).mockResolvedValue({
      locationId: "guild-1",
      actionType: "pet",
      entries: [],
    });

    const interaction = mockInteraction({
      guildId: "guild-1",
      options: { action: "pet" },
    });
    await command.execute(interaction as any);

    expect(getLeaderboard).toHaveBeenCalledWith(
      expect.objectContaining({ actionType: "pet" }),
    );
  });

  it("marks the calling user with (you) in the embed", async () => {
    const entries = [
      { rank: 1, userId: "user-2", displayName: "Other", anonymousLabel: "abcd", totalActions: 50 },
      { rank: 2, userId: "user-1", displayName: "Me", anonymousLabel: "efgh", totalActions: 30 },
    ];

    (getLeaderboard as any).mockResolvedValue({
      locationId: "guild-1",
      actionType: null,
      entries,
    });

    const interaction = mockInteraction({
      guildId: "guild-1",
      user: { id: "user-1" },
    });
    await command.execute(interaction as any);

    const description =
      interaction.__calls.editedReplies[0].embeds[0].data.description;
    expect(description).toContain("Other");
    expect(description).not.toContain("Other — 50 **(you)**");
    expect(description).toContain("Me — 30 **(you)**");
  });
});
