import { vi, describe, it, expect, beforeEach } from "vitest";
import { mockInteraction } from "../helpers/mockInteraction.js";
import { MessageFlags } from "discord.js";

vi.mock("../../src/db/functions.js", () => ({
  getBotData: vi.fn().mockResolvedValue(null),
}));
vi.mock("../../src/utilities/customActions/resolver.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../src/utilities/customActions/resolver.js")>()),
  listSettableActionNames: vi.fn(async () => Object.keys(ACTIONS)),
}));

vi.mock("../../src/utilities/actionHelpers", () => ({
  getActionStatsContainer: vi.fn(),
}));

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
        getMember: (_k: string) => user,
        getUser: (_k: string) => user,
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
        getMember: (_k: string) => user,
        getUser: (_k: string) => user,
        getString: () => "pet",
      },
    });

    await command.execute(interaction as any);

    expect(getActionStatsContainer as any).toHaveBeenCalledTimes(1);
    expect(interaction.__calls.editedReplies.length).toBe(1);
    expect(interaction.__calls.followUps.length).toBe(0);
  });
});

describe("/stats acknowledgement", () => {
  it("defers ephemerally without the components flag, then answers an unavailable action", async () => {
    const order: string[] = [];
    const { listSettableActionNames } = await import(
      "../../src/utilities/customActions/resolver.js"
    );
    (listSettableActionNames as any).mockImplementationOnce(async () => {
      order.push("lookup");
      return [];
    });
    const interaction = mockInteraction({
      options: { getString: () => "gone" },
    });
    interaction.deferReply = vi.fn(async () => {
      order.push("defer");
    });

    await command.execute(interaction as any);

    expect(order).toEqual(["defer", "lookup"]);
    expect(interaction.deferReply).toHaveBeenCalledWith({
      flags: MessageFlags.Ephemeral,
    });
    expect(interaction.__calls.editedReplies).toEqual([
      { content: "That action isn't available here." },
    ]);
    expect(getActionStatsContainer as any).not.toHaveBeenCalled();
  });
});
