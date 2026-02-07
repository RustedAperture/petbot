import { vi, describe, it, expect, beforeEach } from "vitest";
import { mockInteraction } from "../helpers/mockInteraction.js";

vi.mock("../../src/utilities/actionHelpers", () => ({
  getActionStatsContainer: vi.fn(),
}));
vi.mock("../../src/utilities/metrics", () => ({ emitCommand: vi.fn() }));

import { getActionStatsContainer } from "../../src/utilities/actionHelpers.js";
import { ACTIONS } from "../../src/types/constants.js";
import { command } from "../../src/commands/slash/stats.js";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("/stats command", () => {
  it("returns stats for all actions when action omitted", async () => {
    (getActionStatsContainer as any).mockResolvedValue({ container: "pet" });

    const user = { id: "u1", fetch: vi.fn().mockResolvedValue(true) };
    const interaction = mockInteraction({
      options: {
        getMember: (k: string) => user,
        getUser: (k: string) => user,
        getString: () => null,
      },
    });

    await command.execute(interaction as any);

    const expected = Object.keys(ACTIONS).length;
    expect(getActionStatsContainer as any).toHaveBeenCalledTimes(expected);
    expect(interaction.__calls.editedReplies.length).toBe(1);
    expect(interaction.__calls.followUps.length).toBe(expected - 1);
  });

  it("returns only pet when action is 'pet'", async () => {
    (getActionStatsContainer as any).mockResolvedValue({ container: "pet" });

    const user = { id: "u1", fetch: vi.fn().mockResolvedValue(true) };
    const interaction = mockInteraction({
      options: {
        getMember: (k: string) => user,
        getUser: (k: string) => user,
        getString: () => "pet",
      },
    });

    await command.execute(interaction as any);

    expect(getActionStatsContainer as any).toHaveBeenCalledTimes(1);
    expect(interaction.__calls.editedReplies.length).toBe(1);
    expect(interaction.__calls.followUps.length).toBe(0);
  });
});
