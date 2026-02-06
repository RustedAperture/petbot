import { vi, describe, it, expect, beforeEach } from "vitest";
import { mockInteraction } from "../helpers/mockInteraction.js";

vi.mock("../../src/utilities/log.js", () => ({ log: vi.fn() }));
vi.mock("../../src/utilities/db.js", () => ({ BotData: { findOne: vi.fn() } }));
vi.mock("../../src/utilities/metrics", () => ({ emitCommand: vi.fn() }));

import { log } from "../../src/utilities/log.js";
import { BotData } from "../../src/utilities/db.js";
import { command } from "../../src/commands/admin/show.js";

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("/show command", () => {
  it("shows a channel and logs", async () => {
    (BotData.findOne as any).mockResolvedValue({ get: () => "channel-1" });

    const fakeChannel = {
      id: "channel-1",
      permissionOverwrites: { create: vi.fn() },
    };
    const options = {
      getChannel: (k: string) => null,
      getMember: (k: string) => null,
      getString: (k: string) => "reason here",
      getUser: (k: string) => ({ username: "targetuser" }),
    };

    const interaction = mockInteraction({
      options,
      channel: fakeChannel,
      fetchChannel: fakeChannel,
      member: { id: "m1" },
      user: { id: "u1" },
    });

    await command.execute(interaction as any);

    expect(fakeChannel.permissionOverwrites.create).toHaveBeenCalled();
    expect(log as any).toHaveBeenCalled();
    expect(interaction.__calls.replies.length).toBe(1);
  });
});
