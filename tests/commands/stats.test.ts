import { vi, describe, it, expect, beforeEach } from "vitest";
import { mockInteraction } from "../helpers/mockInteraction";

vi.mock("../../src/utilities/actionHelpers", () => ({
  getActionStatsContainer: vi.fn(),
}));
vi.mock("../../src/utilities/metrics", () => ({ emitCommand: vi.fn() }));

import { getActionStatsContainer } from "../../src/utilities/actionHelpers";
import { command } from "../../src/commands/stats/stats";

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("/stats command", () => {
  it("returns both pet and bite when action omitted", async () => {
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

    expect(getActionStatsContainer as any).toHaveBeenCalledTimes(2);
    expect(interaction.__calls.editedReplies.length).toBe(1);
    expect(interaction.__calls.followUps.length).toBe(1);
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
