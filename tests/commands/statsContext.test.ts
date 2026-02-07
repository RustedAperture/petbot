import { vi, describe, it, expect, beforeEach } from "vitest";
import { mockInteraction } from "../helpers/mockInteraction.js";

vi.mock("../../src/utilities/actionHelpers", () => ({
  getActionStatsContainer: vi.fn(),
}));
vi.mock("../../src/utilities/metrics", () => ({ emitCommand: vi.fn() }));

import { getActionStatsContainer } from "../../src/utilities/actionHelpers.js";
import { command } from "../../src/commands/context/statsContext.js";

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("stats context menu", () => {
  it("returns pet and bite stats via editReply and followUp", async () => {
    (getActionStatsContainer as any).mockResolvedValue({ container: "c" });

    const target = { id: "t1", fetch: vi.fn().mockResolvedValue(true) };
    const interaction = mockInteraction({
      targetMember: target,
      targetUser: target,
    });

    await command.execute(interaction as any);

    expect(getActionStatsContainer as any).toHaveBeenCalledTimes(2);
    expect(interaction.__calls.editedReplies.length).toBe(1);
    expect(interaction.__calls.followUps.length).toBe(1);
  });
});
