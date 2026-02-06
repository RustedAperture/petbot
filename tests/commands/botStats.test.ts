import { vi, describe, it, expect, beforeEach } from "vitest";
import { mockInteraction } from "../helpers/mockInteraction";

vi.mock("../../src/utilities/helper", () => ({ fetchGlobalStats: vi.fn() }));
vi.mock("../../src/components/buildGlobalStatsContainer", () => ({
  buildGlobalStatsContainer: vi.fn(),
}));
vi.mock("../../src/utilities/metrics", () => ({ emitCommand: vi.fn() }));

import { fetchGlobalStats } from "../../src/utilities/helper";
import { buildGlobalStatsContainer } from "../../src/components/buildGlobalStatsContainer";
import { command } from "../../src/commands/stats/botStats";

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
    expect(buildGlobalStatsContainer as any).toHaveBeenCalled();
    expect(interaction.__calls.editedReplies.length).toBe(1);
  });
});
