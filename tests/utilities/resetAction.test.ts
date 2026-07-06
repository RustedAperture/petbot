import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock DB & logger modules (drizzle-only)
vi.mock("../../src/db/connector.js", () => {
  const makeResult = (rows: any[]) => ({
    then: (resolve: any) => resolve(rows),
    limit: () => Promise.resolve(rows),
  });
  const select = vi.fn(() => ({
    from: (_table: any) => ({ where: (_: any) => makeResult([]) }),
  }));
  const update = vi.fn(() => ({ set: vi.fn().mockResolvedValue(undefined) }));
  return { drizzleDb: { select, update } };
});
vi.mock("../../src/db/schema.js", () => ({ actionData: {}, botData: {} }));
vi.mock("@utils/log.js", () => ({ log: vi.fn() }));
vi.mock("@logger", () => ({
  default: { debug: vi.fn(), error: vi.fn() },
}));

import { resetAction } from "../../src/utilities/resetAction.js";
import { drizzleDb } from "../../src/db/connector.js";
import { actionData, botData } from "../../src/db/schema.js";

describe("resetAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("resets slot 1 by clearing it so the live guild default applies", async () => {
    const botRow = {
      defaultImages: { pet: "guild-base.png" },
      log_channel: "lc",
    };
    const actionRow = { id: 1, images: ["old1", "old2"] };

    (drizzleDb as any).select.mockImplementation(() => ({
      from: (table: any) => ({
        where: (_: any) => {
          if (table === botData) {
            return {
              then: (r: any) => r(botRow),
              limit: () => Promise.resolve([botRow]),
            };
          }
          if (table === actionData) {
            return {
              then: (r: any) => r([actionRow]),
              limit: () => Promise.resolve([actionRow]),
            };
          }
          return { then: (r: any) => r([]), limit: () => Promise.resolve([]) };
        },
      }),
    }));

    const updateSetSpy = vi.fn(() => ({
      where: vi.fn().mockResolvedValue(undefined),
    }));
    (drizzleDb as any).update.mockImplementation(() => ({ set: updateSetSpy }));

    const interaction = {
      context: 0,
      guild: { name: "G", channels: { fetch: vi.fn().mockResolvedValue({}) } },
      guildId: "g1",
      channelId: "c1",
      user: { id: "u1", username: "u", displayName: "User" },
    } as any;

    await resetAction("pet" as any, interaction, "u1", 1, false);

    expect(updateSetSpy).toHaveBeenCalled();
    const firstCallArg = (updateSetSpy.mock.calls[0] as any)[0];
    expect(firstCallArg.images).toEqual(["old2"]);
  });

  it("resets slot everywhere when everywhere is true", async () => {
    const actionRows = [
      { id: 1, images: ["a", "b"] },
      { id: 2, images: ["x", "y"] },
    ];

    const botRow = {
      defaultImages: { pet: "guild-base.png" },
      log_channel: "lc",
    };
    (drizzleDb as any).select.mockImplementation(() => ({
      from: (table: any) => ({
        where: (_: any) => {
          if (table === actionData) {
            return {
              then: (r: any) => r(actionRows),
              limit: () => Promise.resolve(actionRows),
            };
          }
          if (table === botData) {
            return {
              then: (r: any) => r(botRow),
              limit: () => Promise.resolve([botRow]),
            };
          }
          return { then: (r: any) => r([]), limit: () => Promise.resolve([]) };
        },
      }),
    }));

    const updateSetSpy = vi.fn(() => ({
      where: vi.fn().mockResolvedValue(undefined),
    }));
    (drizzleDb as any).update.mockImplementation(() => ({ set: updateSetSpy }));

    const interaction = {
      context: 0,
      guild: { channels: { fetch: vi.fn().mockResolvedValue({}) } },
      guildId: "g1",
      channelId: "c1",
      user: { id: "u1", username: "u", displayName: "User" },
    } as any;

    await resetAction("pet" as any, interaction, "u1", 1, true);

    expect(updateSetSpy).toHaveBeenCalledTimes(2);
    const call0 = (updateSetSpy.mock.calls[0] as any)[0];
    const call1 = (updateSetSpy.mock.calls[1] as any)[0];
    expect(call0.images).toEqual(["b"]);
    expect(call1.images).toEqual(["y"]);
  });

  it("logs error and returns when no per-location record exists", async () => {
    (drizzleDb as any).select.mockImplementation(() => ({
      from: (_: any) => ({
        where: (_: any) => ({
          then: (r: any) => r([]),
          limit: () => Promise.resolve([]),
        }),
      }),
    }));
    const interaction = {
      context: 0,
      guild: { channels: { fetch: vi.fn().mockResolvedValue({}) } },
      guildId: "g1",
      channelId: "c1",
      user: { id: "u1", username: "u", displayName: "User" },
    } as any;

    await resetAction("pet" as any, interaction, "u1", 1, false);

    const { default: logger } = await import("../../src/logger.js");
    expect(logger.error).toHaveBeenCalled();
    expect((drizzleDb as any).update).not.toHaveBeenCalled();
  });
});
