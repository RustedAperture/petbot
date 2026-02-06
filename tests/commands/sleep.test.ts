import { vi, describe, it, expect, beforeEach } from "vitest";
import { mockInteraction } from "../helpers/mockInteraction";

vi.mock("../../src/utilities/log", () => ({ log: vi.fn() }));
vi.mock("../../src/utilities/db", () => ({ BotData: { findOne: vi.fn() } }));
vi.mock("../../src/utilities/metrics", () => ({ emitCommand: vi.fn() }));

import { log } from "../../src/utilities/log";
import { BotData } from "../../src/utilities/db";
import { command } from "../../src/commands/admin/sleep";

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("/sleep command", () => {
  it("times out the member and logs", async () => {
    (BotData.findOne as any).mockResolvedValue({
      get: () => "https://example/sleep.png",
    });

    const target = {
      id: "t1",
      timeout: vi.fn(),
      displayHexColor: "#000000",
      displayName: "Bob",
      fetch: vi.fn(),
    };
    const interaction = mockInteraction({
      targetMember: target,
      targetUser: { username: "bob" },
      member: {
        id: "m1",
        displayName: "Mod",
        displayAvatarURL: () => "https://example/avatar.png",
      },
      fetchChannel: { send: vi.fn() },
    });

    try {
      await command.execute(interaction as any);
    } catch (err: any) {
      // eslint-disable-next-line no-console
      console.error("SLEEP TEST ERROR:", err && err.stack ? err.stack : err);
      throw err;
    }

    expect(target.timeout).toHaveBeenCalled();
    expect(log as any).toHaveBeenCalled();
    expect(interaction.__calls.replies.length).toBe(1);
  });
});
