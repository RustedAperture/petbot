import { vi, describe, it, expect, beforeEach } from "vitest";
import { MessageFlags } from "discord.js";
import { mockInteraction } from "../helpers/mockInteraction.js";

vi.mock("../../src/utilities/actionHelpers", () => ({
  performAction: vi.fn(),
}));
vi.mock("../../src/utilities/check_user", () => ({
  checkUser: vi.fn(),
  isOptedOut: vi.fn().mockResolvedValue(false),
}));

import { performAction } from "../../src/utilities/actionHelpers.js";
import { command } from "../../src/commands/slash/bite.js";

beforeEach(() => {
  vi.clearAllMocks();
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
          if (k === "target1") {
            return user1;
          }
          if (k === "target2") {
            return user2;
          }
          if (k === "target3") {
            return user3;
          }
          return null;
        },
      },
    });

    await command.execute(interaction as any);

    expect(performAction as any).toHaveBeenCalledTimes(3);
    expect(interaction.__calls.editedReplies.length).toBe(1);
    expect(interaction.__calls.followUps.length).toBe(2);
  });

  it("dedupes targets sharing the same user id", async () => {
    (performAction as any).mockResolvedValue({ container: "c" });

    const userA = { id: "t1", fetch: vi.fn().mockResolvedValue(true) };
    const userB = { id: "t1", fetch: vi.fn().mockResolvedValue(true) }; // different object same id

    const interaction = mockInteraction({
      options: {
        getUser: (k: string) => {
          if (k === "target1") {
            return userA;
          }
          if (k === "target2") {
            return userB;
          }
          if (k === "target3") {
            return null;
          }
          return null;
        },
      },
    });

    await command.execute(interaction as any);

    expect(performAction as any).toHaveBeenCalledTimes(1);
    expect(interaction.__calls.editedReplies.length).toBe(1);
    expect(interaction.__calls.followUps.length).toBe(0);
  });

  it("replies ephemerally and does nothing when all targets are opted-out", async () => {
    (performAction as any).mockResolvedValue({ container: "c" });
    const { isOptedOut } = await import("../../src/utilities/check_user.js");
    (isOptedOut as any).mockResolvedValue(true);

    const user1 = { id: "t1", fetch: vi.fn().mockResolvedValue(true) };
    const interaction = mockInteraction({
      options: { getUser: (k: string) => (k === "target1" ? user1 : null) },
    });

    await command.execute(interaction as any);

    expect(interaction.__calls.replies.length).toBe(1);
    expect(interaction.__calls.replies[0].flags).toBe(MessageFlags.Ephemeral);
    expect(performAction as any).not.toHaveBeenCalled();
  });
});
