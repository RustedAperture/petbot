import { vi, describe, it, expect, beforeEach } from "vitest";
import { mockInteraction } from "../helpers/mockInteraction.js";

vi.mock("../../src/utilities/actionHelpers", () => ({
  performAction: vi.fn(),
}));
vi.mock("../../src/utilities/metrics", () => ({ emitCommand: vi.fn() }));

import { performAction } from "../../src/utilities/actionHelpers.js";
import { command } from "../../src/commands/context/biteContext.js";

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("bite context menu", () => {
  it("performs action and edits reply", async () => {
    (performAction as any).mockResolvedValue({ container: "c" });

    const target = { id: "t1", fetch: vi.fn().mockResolvedValue(true) };
    const interaction = mockInteraction({
      targetMember: target,
      targetUser: target,
      member: { id: "m1" },
    });

    await command.execute(interaction as any);

    expect(performAction as any).toHaveBeenCalledTimes(1);
    expect(interaction.__calls.editedReplies.length).toBe(1);
  });
});
