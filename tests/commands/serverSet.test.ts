import { vi, describe, it, expect, beforeEach } from "vitest";
import { mockInteraction } from "../helpers/mockInteraction.js";

vi.mock("../../src/db/connector.js", () => ({
  drizzleDb: {
    select: vi.fn(() => ({
      from: (_table: any) => ({
        where: (_: any) => ({
          limit: () => Promise.resolve([]),
        }),
      }),
    })),
    update: vi.fn(() => ({
      set: () => ({
        where: () => Promise.resolve(),
      }),
    })),
    insert: vi.fn(() => ({
      values: () => Promise.resolve(),
    })),
  },
}));
vi.mock("../../src/db/schema.js", () => ({ botData: {} }));

import { drizzleDb } from "../../src/db/connector.js";
import { command } from "../../src/commands/slash/serverSet.js";

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("/server-set command", () => {
  it("updates default image map and replies with an embed when no log channel", async () => {
    (drizzleDb.select as any).mockImplementation(() => ({
      from: (_table: any) => ({
        where: (_: any) => ({
          limit: () => Promise.resolve([]),
        }),
      }),
    }));

    const interaction = mockInteraction({
      options: { action: "pet", url: "https://example.com/pet.png" },
      member: { id: "user-1" },
    });

    await command.execute(interaction as any);

    expect((drizzleDb.update as any).mock.calls.length).toBe(1);
    expect(interaction.__calls.replies.length).toBe(1);
    expect(interaction.__calls.replies[0].embeds).toBeDefined();
  });

  it("sends summary to log channel and replies with confirmation when log channel is set", async () => {
    const sendMock = vi.fn();
    const fakeChannel = { send: sendMock, isTextBased: () => true };

    (drizzleDb.select as any).mockImplementation(() => ({
      from: (_table: any) => ({
        where: (_: any) => ({
          limit: () => Promise.resolve([{ logChannel: "123" }]),
        }),
      }),
    }));

    const interaction = mockInteraction({
      options: { action: "pet", url: "https://example.com/pet.png" },
      guild: {
        id: "guild-1",
        channels: { fetch: async () => fakeChannel },
      },
      member: { id: "user-1" },
    });

    await command.execute(interaction as any);

    expect(sendMock).toHaveBeenCalled();
    expect(interaction.__calls.replies.length).toBe(1);
    expect(interaction.__calls.replies[0].content).toBe(
      "Updated Configs. This has been logged.",
    );
  });
});
