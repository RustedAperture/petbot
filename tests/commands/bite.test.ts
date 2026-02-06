import { vi, describe, it, expect, beforeEach } from "vitest";
import { mockInteraction } from "../helpers/mockInteraction.js";

vi.mock("../../src/utilities/actionHelpers", () => ({
  performAction: vi.fn(),
}));
vi.mock("../../src/utilities/check_user", () => ({ checkUser: vi.fn() }));
vi.mock("../../src/utilities/metrics", () => ({ emitCommand: vi.fn() }));

import { performAction } from "../../src/utilities/actionHelpers.js";
import { command } from "../../src/commands/bite/bite.js";

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("/bite command", () => {
  it("performs action and edits reply for single target", async () => {
    (performAction as any).mockResolvedValue({ container: "c1" });

    const user1 = { id: "t1", fetch: vi.fn().mockResolvedValue(true) };
    const interaction = mockInteraction({
      options: { getUser: (k: string) => (k === "target1" ? user1 : null) },
    });

    await command.execute(interaction as any);

    expect(performAction as any).toHaveBeenCalledTimes(1);
    expect(interaction.__calls.editedReplies.length).toBe(1);
    expect(interaction.__calls.followUps.length).toBe(0);
  });

  it("follows up for additional targets", async () => {
    (performAction as any).mockResolvedValue({ container: "c" });

    const user1 = { id: "t1", fetch: vi.fn().mockResolvedValue(true) };
    const user2 = { id: "t2", fetch: vi.fn().mockResolvedValue(true) };
    const user3 = { id: "t3", fetch: vi.fn().mockResolvedValue(true) };

    const interaction = mockInteraction({
      options: {
        getUser: (k: string) => {
          if (k === "target1") return user1;
          if (k === "target2") return user2;
          if (k === "target3") return user3;
          return null;
        },
      },
    });

    await command.execute(interaction as any);

    expect(performAction as any).toHaveBeenCalledTimes(3);
    expect(interaction.__calls.editedReplies.length).toBe(1);
    expect(interaction.__calls.followUps.length).toBe(2);
  });
});
