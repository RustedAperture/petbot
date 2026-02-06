import { vi, describe, it, expect, beforeEach } from "vitest";
import { mockInteraction } from "../helpers/mockInteraction.js";

vi.mock("../../src/utilities/check_user.js", () => ({ checkUser: vi.fn() }));
vi.mock("../../src/utilities/resetAction.js", () => ({ resetAction: vi.fn() }));
vi.mock("../../src/utilities/metrics", () => ({ emitCommand: vi.fn() }));

import { checkUser } from "../../src/utilities/check_user.js";
import { resetAction } from "../../src/utilities/resetAction.js";
import { command } from "../../src/commands/user/reset.js";

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("/reset command", () => {
  it("returns invalid action for bad action", async () => {
    const interaction = mockInteraction({
      options: { action: "not-an-action", slot: 1 },
    });

    await command.execute(interaction as any);

    expect(interaction.__calls.editedReplies.length).toBe(1);
    expect(interaction.__calls.editedReplies[0].content).toContain(
      "Invalid action",
    );
  });

  it("calls resetAction on valid action", async () => {
    (resetAction as any).mockResolvedValue(true);
    const interaction = mockInteraction({
      options: { action: "pet", slot: 2, everywhere: true },
    });

    await command.execute(interaction as any);

    expect(resetAction as any).toHaveBeenCalled();
    expect(interaction.__calls.editedReplies.length).toBe(1);
  });
});
