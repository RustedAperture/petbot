import { describe, it, expect, vi, beforeEach } from "vitest";
import { MessageFlags } from "discord.js";

vi.mock("../../logger.js", () => ({
  default: { debug: vi.fn(), error: vi.fn() },
}));
import { log } from "../../utilities/log.js";

describe("log util", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sends a container to the channel with components and flags", async () => {
    const send = vi.fn();
    const channel = { send } as any;
    const trigger = { username: "bob" } as any;

    await log(
      "Title",
      "Desc",
      channel,
      trigger,
      "http://img",
      undefined,
      [1, 2, 3],
    );

    expect(send).toHaveBeenCalled();
    const arg = send.mock.calls[0][0];
    expect(arg.flags).toBe(MessageFlags.IsComponentsV2);
    expect(Array.isArray(arg.components)).toBe(true);
    expect(arg.components.length).toBe(1);
  });
});
