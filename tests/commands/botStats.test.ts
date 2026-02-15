import { vi, describe, it, expect, beforeEach } from "vitest";
import { mockInteraction } from "../helpers/mockInteraction.js";

vi.mock("../../src/utilities/helper", () => ({
  fetchGlobalStats: vi.fn(),
  fetchStatsForLocation: vi.fn(),
}));
vi.mock("../../src/components/buildGlobalStatsContainer", () => ({
  buildGlobalStatsContainer: vi.fn(),
}));

import { fetchGlobalStats } from "../../src/utilities/helper.js";
import { buildGlobalStatsContainer } from "../../src/components/buildGlobalStatsContainer.js";
import { command } from "../../src/commands/slash/botStats.js";

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("/botstats command", () => {
  it("fetches stats and edits reply", async () => {
    (fetchGlobalStats as any).mockResolvedValue({ count: 123 });
    (buildGlobalStatsContainer as any).mockReturnValue({ container: "c" });

    const interaction = mockInteraction({ options: {}, fetchChannel: null });

    await command.execute(interaction as any);

    expect(fetchGlobalStats as any).toHaveBeenCalled();
    expect(buildGlobalStatsContainer as any).toHaveBeenCalledWith(
      expect.any(Object),
      false,
    );
    expect(interaction.__calls.editedReplies.length).toBe(1);
  });

  it("fetches local stats when local=true and uses guild/channel id", async () => {
    const { fetchStatsForLocation } =
      await import("../../src/utilities/helper.js");

    (fetchStatsForLocation as any).mockResolvedValue({ count: 456 });
    (buildGlobalStatsContainer as any).mockReturnValue({ container: "c" });

    const interaction = mockInteraction({
      options: { local: true },
      fetchChannel: null,
      guildId: "guild-42",
      channelId: "channel-42",
    });

    await command.execute(interaction as any);

    expect(fetchStatsForLocation as any).toHaveBeenCalledWith("guild-42");
    expect(buildGlobalStatsContainer as any).toHaveBeenCalledWith(
      expect.any(Object),
      true,
    );
    expect(interaction.__calls.editedReplies.length).toBe(1);
  });
});
