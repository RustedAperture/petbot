import { vi, describe, it, expect, beforeEach } from "vitest";
import { mockInteraction } from "../helpers/mockInteraction.js";

vi.mock("../../src/db/connector.js", () => {
  const makeResult = (rows: any[]) => ({
    then: (resolve: any) => resolve(rows),
    limit: () => Promise.resolve(rows),
  });
  const select = vi.fn(() => ({
    from: (_table: any) => ({ where: (_cond: any) => makeResult([]) }),
  }));
  const insert = vi.fn(() => ({
    values: vi.fn().mockResolvedValue(undefined),
  }));
  const update = vi.fn(() => ({
    set: vi.fn(() => ({ where: vi.fn().mockResolvedValue(undefined) })),
  }));
  return { drizzleDb: { select, insert, update } };
});
vi.mock("../../src/db/schema.js", () => ({ botData: {} }));

import { drizzleDb } from "../../src/db/connector.js";
import { command } from "../../src/commands/slash/serverSetup.js";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("/setup command", () => {
  it("creates guild settings when none exist and replies with fallback (no log channel)", async () => {
    // default mock returns no guild row
    const interaction = mockInteraction({
      options: {
        nickname: "bot",
        default_pet: "http://example/a.png",
        default_bite: null,
        sleep_image: null,
        default_bonk: null,
        default_squish: null,
      },
      fetchMember: { setNickname: vi.fn() },
    });

    await command.execute(interaction as any);

    expect((drizzleDb as any).insert).toHaveBeenCalled();
    expect(interaction.__calls.replies.length).toBe(1);
    expect(interaction.__calls.replies[0].content).toBe(
      "No log channel has been set yet.",
    );
  });

  it("replies and logs when log channel exists and send succeeds", async () => {
    // make select return a bot row with log_channel
    (drizzleDb as any).select.mockImplementation(() => ({
      from: (_table: any) => ({
        where: (_cond: any) => ({
          then: (r: any) =>
            r({ default_images: null, log_channel: "channel-1" }),
          limit: () =>
            Promise.resolve([
              { default_images: null, log_channel: "channel-1" },
            ]),
        }),
      }),
    }));

    const fakeLog = { id: "channel-1", send: vi.fn() };
    const interaction = mockInteraction({
      options: {
        nickname: null,
        default_pet: null,
        default_bite: null,
        sleep_image: null,
        default_bonk: null,
        default_squish: null,
      },
      fetchChannel: fakeLog,
      fetchMember: { setNickname: vi.fn() },
    });

    await command.execute(interaction as any);

    expect((drizzleDb as any).insert).not.toHaveBeenCalled();
    expect(fakeLog.send).toHaveBeenCalled();
    expect(interaction.__calls.replies.length).toBe(1);
    expect(interaction.__calls.replies[0].content).toBe(
      "Updated Configs. This has been logged.",
    );
  });

  it("replies with fallback when log channel not set or send fails", async () => {
    // make select return a bot row with a non-existent channel id
    (drizzleDb as any).select.mockImplementation(() => ({
      from: (_table: any) => ({
        where: (_cond: any) => ({
          then: (r: any) =>
            r({ default_images: null, log_channel: "non-existent-channel" }),
          limit: () =>
            Promise.resolve([
              { default_images: null, log_channel: "non-existent-channel" },
            ]),
        }),
      }),
    }));

    const interaction = mockInteraction({
      options: {
        nickname: null,
        default_pet: null,
        default_bite: null,
        sleep_image: null,
        default_bonk: null,
        default_squish: null,
      },
      fetchChannel: null,
    });

    await command.execute(interaction as any);

    expect(interaction.__calls.replies.length).toBe(1);
    expect(interaction.__calls.replies[0].content).toBe(
      "No log channel has been set yet.",
    );
  });
});
