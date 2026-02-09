import { vi, describe, it, expect, beforeEach } from "vitest";
import { mockInteraction } from "../helpers/mockInteraction.js";

vi.mock("../../src/utilities/actionHelpers", () => ({
  performAction: vi.fn(),
}));
vi.mock("../../src/utilities/check_user", () => ({ checkUser: vi.fn() }));
vi.mock("../../src/utilities/metrics", () => ({ emitCommand: vi.fn() }));

import { performAction } from "../../src/utilities/actionHelpers.js";
import { command } from "../../src/commands/slash/explode.js";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("/explode command", () => {
  it("performs action and deduplicates targets", async () => {
    (performAction as any).mockResolvedValue({ container: "c" });

    const user1 = { id: "t1", fetch: vi.fn().mockResolvedValue(true) };
    const user2 = { id: "t1", fetch: vi.fn().mockResolvedValue(true) }; // duplicate id

    const interaction = mockInteraction({
      options: {
        getUser: (k: string) => {
          if (k === "target1") return user1;
          if (k === "target2") return user2;
          return null;
        },
      },
    });

    await command.execute(interaction as any);

    expect(performAction as any).toHaveBeenCalledTimes(1);
    expect(interaction.__calls.editedReplies.length).toBe(1);
    expect(interaction.__calls.followUps.length).toBe(0);
  });

  it("handles multiple unique targets with followUps", async () => {
    (performAction as any).mockResolvedValue({ container: "c" });

    const user1 = { id: "t1", fetch: vi.fn().mockResolvedValue(true) };
    const user2 = { id: "t2", fetch: vi.fn().mockResolvedValue(true) };

    const interaction = mockInteraction({
      options: {
        getUser: (k: string) => {
          if (k === "target1") return user1;
          if (k === "target2") return user2;
          return null;
        },
      },
    });

    await command.execute(interaction as any);

    expect(performAction as any).toHaveBeenCalledTimes(2);
    expect(interaction.__calls.editedReplies.length).toBe(1);
    expect(interaction.__calls.followUps.length).toBe(1);
  });
});
