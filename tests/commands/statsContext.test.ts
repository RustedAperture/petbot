import { vi, describe, it, expect, beforeEach } from "vitest";
import { mockInteraction } from "../helpers/mockInteraction.js";

vi.mock("../../src/db/functions.js", () => ({
  getBotData: vi.fn().mockResolvedValue(null),
}));
vi.mock("../../src/utilities/customActions/resolver.js", async (importOriginal) => {
  const original = await importOriginal<typeof import("../../src/utilities/customActions/resolver.js")>();
  const { ACTIONS } = await import("../../src/types/constants.js");
  return {
    ...original,
    resolveAvailableActions: vi.fn(async () =>
      (Object.keys(ACTIONS) as Array<keyof typeof ACTIONS>).map(original.resolveBuiltIn),
    ),
    listCustomNamesWithRows: vi.fn(async () => ["wave", "hop"]),
    resolveAction: vi.fn(async (name: string) =>
      name in ACTIONS ? original.resolveBuiltIn(name as keyof typeof ACTIONS) : null,
    ),
  };
});

vi.mock("../../src/utilities/actionHelpers", () => ({
  getActionStatsContainer: vi.fn(),
}));

import { getActionStatsContainer } from "../../src/utilities/actionHelpers.js";
import { ACTIONS } from "../../src/types/constants.js";
import { command } from "../../src/commands/context/statsContext.js";

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("stats context menu", () => {
  it("returns stats for all actions via editReply and followUp", async () => {
    (getActionStatsContainer as any).mockResolvedValue({ container: "c" });

    const target = { id: "t1", fetch: vi.fn().mockResolvedValue(true) };
    const interaction = mockInteraction({
      targetMember: target,
      targetUser: target,
    });

    await command.execute(interaction as any);

    expect(getActionStatsContainer as any).toHaveBeenCalledTimes(
      Object.keys(ACTIONS).length + 2,
    );
    expect(interaction.__calls.editedReplies.length).toBe(1);
    expect(interaction.__calls.followUps.length).toBeLessThanOrEqual(5);
    const sent = [
      ...interaction.__calls.editedReplies,
      ...interaction.__calls.followUps,
    ];
    expect(sent.flatMap((m: any) => m.components)).toHaveLength(
      Object.keys(ACTIONS).length + 2,
    );
  });

  it("notes how many actions were shown when more than 36 remain", async () => {
    (getActionStatsContainer as any).mockResolvedValue({ container: "c" });
    const { listCustomNamesWithRows } = await import("../../src/utilities/customActions/resolver.js");
    (listCustomNamesWithRows as any).mockResolvedValueOnce(
      Array.from({ length: 31 }, (_, i) => `custom${i}`),
    );
    const target = { id: "t1", fetch: vi.fn().mockResolvedValue(true) };
    const interaction = mockInteraction({ targetMember: target, targetUser: target });

    await command.execute(interaction as any);

    const sent = [
      ...interaction.__calls.editedReplies,
      ...interaction.__calls.followUps,
    ];
    expect(interaction.__calls.followUps.length).toBeLessThanOrEqual(5);
    const last = sent.at(-1).components.at(-1);
    expect(last.data.content).toBe("Showing 36 of 37 actions.");
  });
});
