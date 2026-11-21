import { vi, describe, it, expect, beforeEach } from "vitest";
import { mockInteraction } from "../helpers/mockInteraction.js";
import { MessageFlags } from "discord.js";

vi.mock("../../src/db/functions.js", () => ({
  getBotData: vi.fn().mockResolvedValue(null),
}));
vi.mock("../../src/utilities/customActions/resolver.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../src/utilities/customActions/resolver.js")>()),
  listCustomNamesWithRows: vi.fn(async () => []),
}));

vi.mock("../../src/utilities/customActions/statsAction.js", () => ({
  resolveStatsAction: vi.fn(async (name: string) => ({ name })),
}));

vi.mock("../../src/utilities/actionHelpers", () => ({
  getActionStatsContainer: vi.fn(),
}));

import { getActionStatsContainer } from "../../src/utilities/actionHelpers.js";
import { listCustomNamesWithRows } from "../../src/utilities/customActions/resolver.js";
import { ACTIONS } from "../../src/types/constants.js";
import { command } from "../../src/commands/slash/stats.js";

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(listCustomNamesWithRows).mockResolvedValue([]);
  (getActionStatsContainer as any).mockResolvedValue({ container: "card" });
});

function statsInteraction(actionName: string | null, user = { id: "u1" }) {
  const target = { ...user, fetch: vi.fn().mockResolvedValue(true) };
  return mockInteraction({
    options: {
      getMember: () => target,
      getUser: () => target,
      getString: () => actionName,
    },
  });
}

describe("/stats command", () => {
  it("returns stats for all built-ins in one message when action omitted", async () => {
    const interaction = statsInteraction(null);

    await command.execute(interaction as any);

    expect(getActionStatsContainer as any).toHaveBeenCalledTimes(
      Object.keys(ACTIONS).length,
    );
    expect(interaction.__calls.editedReplies.length).toBe(1);
    expect(interaction.__calls.editedReplies[0].components).toHaveLength(
      Object.keys(ACTIONS).length,
    );
    expect(interaction.__calls.followUps.length).toBe(0);
  });

  it("includes a custom name the target has rows for at this location", async () => {
    vi.mocked(listCustomNamesWithRows).mockResolvedValue(["wave"]);
    const interaction = statsInteraction(null);

    await command.execute(interaction as any);

    expect(listCustomNamesWithRows).toHaveBeenCalledWith("u1", "guild-1");
    expect(getActionStatsContainer as any).toHaveBeenCalledTimes(
      Object.keys(ACTIONS).length + 1,
    );
    expect(
      (getActionStatsContainer as any).mock.calls.map((c: any[]) => c[0].name),
    ).toContain("wave");
  });

  it("returns only pet when action is 'pet'", async () => {
    const interaction = statsInteraction("pet");

    await command.execute(interaction as any);

    expect(getActionStatsContainer as any).toHaveBeenCalledTimes(1);
    expect(interaction.__calls.editedReplies.length).toBe(1);
    expect(interaction.__calls.followUps.length).toBe(0);
  });

  it("accepts an explicit custom action the target has rows for", async () => {
    vi.mocked(listCustomNamesWithRows).mockResolvedValue(["wave"]);
    const interaction = statsInteraction("wave", { id: "someone-else" });

    await command.execute(interaction as any);

    expect(listCustomNamesWithRows).toHaveBeenCalledWith("someone-else", "guild-1");
    expect(getActionStatsContainer as any).toHaveBeenCalledTimes(1);
    expect(interaction.__calls.editedReplies[0].components).toBeDefined();
  });

  it("rejects a name the target has no rows for", async () => {
    const interaction = statsInteraction("wave");

    await command.execute(interaction as any);

    expect(getActionStatsContainer as any).not.toHaveBeenCalled();
    expect(interaction.__calls.editedReplies).toEqual([
      { content: "That action isn't available here." },
    ]);
  });
});

describe("/stats acknowledgement", () => {
  it("defers ephemerally before any lookup, without the components flag", async () => {
    const order: string[] = [];
    vi.mocked(listCustomNamesWithRows).mockImplementationOnce(async () => {
      order.push("lookup");
      return [];
    });
    const interaction = statsInteraction("gone");
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
  });
});
