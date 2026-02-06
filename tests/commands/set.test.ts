import { vi, describe, it, expect, beforeEach } from "vitest";
import { mockInteraction } from "../helpers/mockInteraction.js";

vi.mock("../../src/utilities/check_image.js", () => ({ checkImage: vi.fn() }));
vi.mock("../../src/utilities/updateAction.js", () => ({ updateAction: vi.fn() }));
vi.mock("../../src/utilities/check_user", () => ({ checkUser: vi.fn() }));
vi.mock("../../src/utilities/metrics", () => ({ emitCommand: vi.fn() }));
vi.mock("../../src/utilities/normalizeUrl", () => ({
  normalizeUrl: (u: string) => u,
}));
vi.mock("../../src/utilities/db", () => ({
  ActionData: { findOne: vi.fn() },
  BotData: { findOne: vi.fn() },
}));

import { checkImage } from "../../src/utilities/check_image.js";
import { updateAction } from "../../src/utilities/updateAction.js";
import { ActionData, BotData } from "../../src/utilities/db.js";

import { command } from "../../src/commands/user/set.js";

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("/set command", () => {
  it("calls updateAction when checkImage succeeds", async () => {
    (checkImage as any).mockResolvedValue(true);
    (updateAction as any).mockResolvedValue(true);

    const interaction = mockInteraction({
      options: { action: "pet", url: "http://example.com/a.png", slot: 1 },
    });

    await command.execute(interaction as any);

    expect(updateAction as any).toHaveBeenCalled();
  });

  it("replies with invalid message when checkImage fails", async () => {
    (checkImage as any).mockResolvedValue(false);
    const interaction = mockInteraction({
      options: { action: "pet", url: "http://example.com/a.png", slot: 1 },
    });

    await command.execute(interaction as any);

    expect(interaction.__calls.editedReplies.length).toBe(1);
    expect(interaction.__calls.editedReplies[0].content).toBe(
      "Your URL is invalid, please try again",
    );
  });

  it("forces slot to 1 when slot >=2 and current image is default", async () => {
    (checkImage as any).mockResolvedValue(true);

    (BotData.findOne as any).mockResolvedValue({ get: () => "guild-default" });
    (ActionData.findOne as any).mockResolvedValue({
      get: () => ["guild-default"],
    });

    const interaction = mockInteraction({
      options: { action: "pet", url: "http://example.com/a.png", slot: 2 },
    });

    await command.execute(interaction as any);

    expect(updateAction as any).toHaveBeenCalled();
    const calledArgs = (updateAction as any).mock.calls[0];
    // slot is arg 6
    expect(calledArgs[6]).toBe(1);
  });
});
