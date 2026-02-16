import { vi, describe, it, expect, beforeEach } from "vitest";
import { mockInteraction } from "../helpers/mockInteraction.js";

import { command } from "../../src/commands/context/performContext.js";
import { ACTIONS } from "../../src/types/constants.js";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("perform context command", () => {
  it("replies with a select menu listing actions", async () => {
    const target = { id: "t1" };
    const interaction = mockInteraction({
      targetUser: target,
      targetMember: target,
    });

    await command.execute(interaction as any);

    expect(interaction.__calls.showModals.length).toBe(1);
    const modal = interaction.__calls.showModals[0];
    expect(modal.data.custom_id).toBe(`perform-modal:${target.id}`);

    const serialized =
      typeof modal.toJSON === "function" ? modal.toJSON() : modal;

    // Recursively search for a select payload with options
    function findSelect(obj: any): any {
      if (!obj || typeof obj !== "object") {
        return null;
      }
      if (Array.isArray(obj)) {
        for (const el of obj) {
          const found = findSelect(el);
          if (found) {
            return found;
          }
        }
        return null;
      }
      if (obj.options && Array.isArray(obj.options)) {
        return obj;
      }
      for (const k of Object.keys(obj)) {
        const found = findSelect(obj[k]);
        if (found) {
          return found;
        }
      }
      return null;
    }

    const select = findSelect(serialized);
    expect(select).toBeDefined();
    expect(select.options.length).toBe(Object.keys(ACTIONS).length);
    expect(select.options[0].label).toBe(Object.keys(ACTIONS)[0]);
  });
});
