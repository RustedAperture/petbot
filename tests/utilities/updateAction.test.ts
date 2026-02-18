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
  const updateSet = vi.fn(() => ({
    where: vi.fn().mockResolvedValue(undefined),
  }));
  const update = vi.fn(() => ({ set: updateSet }));
  return { drizzleDb: { select, update } };
});
vi.mock("../../src/db/schema.js", () => ({ actionData: {}, botData: {} }));
vi.mock("@utils/log.js", () => ({ log: vi.fn() }));
vi.mock("@logger", () => ({
  default: { debug: vi.fn(), error: vi.fn() },
}));

import { updateAction } from "../../src/utilities/updateAction.js";
import { drizzleDb } from "../../src/db/connector.js";

describe("updateAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("updates the slot for a single record (per-location)", async () => {
    const mockRecord = { id: 1, images: ["old1", "old2"] };
    (drizzleDb as any).select.mockImplementation(() => ({
      from: (_table: any) => ({
        where: (_: any) => ({
          then: (r: any) => r([mockRecord]),
          limit: () => Promise.resolve([mockRecord]),
        }),
      }),
    }));

    const interaction = {
      context: 0,
      commandName: "set-pet",
      guild: {
        name: "G",
        channels: { fetch: vi.fn().mockResolvedValue(null) },
      },
      guildId: "g1",
      channelId: "c1",
      user: { id: "u1", username: "u", displayName: "User" },
      editReply: vi.fn().mockResolvedValue({}),
    } as any;

    await updateAction(
      "pet" as any,
      interaction,
      "u1",
      "new-url",
      false,
      null,
      1,
    );

    expect((drizzleDb as any).update).toHaveBeenCalled();
    const setMock = (drizzleDb as any).update().set;
    const firstArg = (setMock.mock.calls[0] as any)[0];
    expect(firstArg.images).toEqual(["new-url", "old2"]);
  });

  it("updates the slot for all records when everywhere is true", async () => {
    (drizzleDb as any).select.mockImplementation(() => ({
      from: (_table: any) => ({
        where: (_: any) => ({
          then: (r: any) =>
            r([
              { id: 1, images: ["a", "b"] },
              { id: 2, images: ["x", "y"] },
            ]),
          limit: () =>
            Promise.resolve([
              { id: 1, images: ["a", "b"] },
              { id: 2, images: ["x", "y"] },
            ]),
        }),
      }),
    }));

    const interaction = {
      context: 0,
      commandName: "set-pet",
      guild: {
        name: "G",
        channels: { fetch: vi.fn().mockResolvedValue(null) },
      },
      guildId: "g1",
      channelId: "c1",
      user: { id: "u1", username: "u", displayName: "User" },
      editReply: vi.fn().mockResolvedValue({}),
    } as any;

    await updateAction(
      "pet" as any,
      interaction,
      "u1",
      "everywhere-url",
      true,
      null,
      2,
    );

    expect((drizzleDb as any).update).toHaveBeenCalled();
    const setMock = (drizzleDb as any).update().set;
    const call0 = (setMock.mock.calls[0] as any)[0];
    const call1 = (setMock.mock.calls[1] as any)[0];
    expect(call0.images).toEqual(["a", "everywhere-url"]);
    expect(call1.images).toEqual(["x", "everywhere-url"]);
  });

  it("edits reply with personal message for change-<action> command", async () => {
    const mockRecord = { id: 1, images: JSON.stringify(["old"]) };
    (drizzleDb as any).select.mockImplementation(() => ({
      from: (_table: any) => ({
        where: (_: any) => ({
          then: (r: any) => r([mockRecord]),
          limit: () => Promise.resolve([mockRecord]),
        }),
      }),
    }));

    const interaction = {
      context: 0,
      commandName: "change-pet",
      guild: {
        name: "G",
        channels: { fetch: vi.fn().mockResolvedValue(null) },
      },
      guildId: "g1",
      channelId: "c1",
      user: { id: "u1", username: "u", displayName: "User" },
      editReply: vi.fn().mockResolvedValue({}),
    } as any;

    await updateAction(
      "pet" as any,
      interaction,
      "u1",
      "new-url",
      false,
      "reason",
      1,
    );

    expect(interaction.editReply).toHaveBeenCalledWith({
      content: "Updated your image to the new url",
      flags: expect.any(Number),
    });
  });
});
