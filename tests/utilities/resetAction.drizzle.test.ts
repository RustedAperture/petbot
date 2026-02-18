import { describe, it, expect, vi, beforeEach } from "vitest";

// Provide a drizzle-backed mock for connector/schema so we exercise the drizzle code-path
vi.mock("../../src/db/connector.js", () => ({
  drizzleDb: {
    select: vi.fn(() => ({
      from: (_t: any) => ({ where: () => ({ then: (r: any) => r([]) }) }),
    })),
    update: vi.fn(() => ({ set: vi.fn().mockResolvedValue(undefined) })),
  },
}));
vi.mock("../../src/db/schema.js", () => ({ actionData: {}, botData: {} }));

vi.mock("@utils/log.js", () => ({ log: vi.fn() }));
vi.mock("@logger", () => ({ default: { debug: vi.fn(), error: vi.fn() } }));

// Import after mocks
import { resetAction } from "../../src/utilities/resetAction.js";
import { drizzleDb } from "../../src/db/connector.js";
import { actionData, botData } from "../../src/db/schema.js";

describe("resetAction (drizzle path)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("resets slot 1 to guild base image for a single record (drizzle)", async () => {
    // Arrange: make select/from/where/limit return guildSettings for botData and a single action record for actionData
    const botRow = {
      defaultImages: { pet: "guild-base.png" },
      log_channel: "lc",
    };
    const actionRow = { id: 1, images: ["old1", "old2"] };

    // Replace select implementation to return different rows depending on the table argument
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
    expect(firstCallArg.images).toEqual(["guild-base.png", "old2"]);
  });

  it("resets slot everywhere for all records (drizzle)", async () => {
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
    expect(call0.images).toEqual(["guild-base.png", "b"]);
    expect(call1.images).toEqual(["guild-base.png", "y"]);
  });
});
