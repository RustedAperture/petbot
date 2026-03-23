import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../src/db/connector.js", () => ({
  drizzleDb: {
    select: vi.fn(() => ({
      from: (_table: any) => ({
        where: (_condition: any) => ({
          limit: () => Promise.resolve([]),
        }),
      }),
    })),
    update: vi.fn(() => ({
      set: (_data: any) => ({
        where: (_condition: any) => Promise.resolve(),
      }),
    })),
    insert: vi.fn(() => ({
      values: (_row: any) => Promise.resolve(),
    })),
  },
}));

// Avoid cyclic dependency issue by importing after mock registration
import { getBotData, upsertBotData } from "../../src/db/functions.js";
import { drizzleDb } from "../../src/db/connector.js";

describe("db/functions helpers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("getBotData normalizes defaultImages JSON string into map", async () => {
    (drizzleDb.select as any).mockImplementation(() => ({
      from: (_table: any) => ({
        where: (_condition: any) => ({
          limit: () =>
            Promise.resolve([
              {
                id: 1,
                guildId: "guild-1",
                logChannel: "",
                nickname: "",
                sleepImage: "",
                defaultImages: '{"pet":"https://example.com/pet.png"}',
                restricted: false,
                createdAt: "2026-01-01T00:00:00.000Z",
                updatedAt: "2026-01-01T00:00:00.000Z",
              },
            ]),
        }),
      }),
    }));

    const result = await getBotData("guild-1");

    expect(result).toEqual(
      expect.objectContaining({
        guildId: "guild-1",
        defaultImages: { pet: "https://example.com/pet.png" },
      }),
    );
  });

  it("upsertBotData inserts when there is no existing record", async () => {
    (drizzleDb.select as any).mockImplementation(() => ({
      from: (_table: any) => ({
        where: (_condition: any) => ({
          limit: () => Promise.resolve([]),
        }),
      }),
    }));

    const result = await upsertBotData("guild-2", {
      logChannel: "123",
      defaultImages: { pet: "https://example.com/pet2.png" },
      restricted: true,
    });

    expect((drizzleDb.insert as any).mock.calls.length).toBe(1);
    const inserted = (drizzleDb.insert as any).mock.calls[0][0];
    expect(inserted).toBeDefined();
    expect(result.guildId).toBe("guild-2");
    expect(result.defaultImages).toEqual({
      pet: "https://example.com/pet2.png",
    });
    expect(result.restricted).toBe(true);
  });

  it("upsertBotData updates existing record and deserializes defaultImages", async () => {
    (drizzleDb.select as any).mockImplementation(() => ({
      from: (_table: any) => ({
        where: (_condition: any) => ({
          limit: () =>
            Promise.resolve([
              {
                id: 99,
                guildId: "guild-3",
                logChannel: "lol",
                nickname: "bot",
                sleepImage: "",
                defaultImages: { pet: "https://example.com/pet3.png" },
                restricted: false,
                createdAt: "2026-01-01T00:00:00.000Z",
                updatedAt: "2026-01-01T00:00:00.000Z",
              },
            ]),
        }),
      }),
    }));

    const result = await upsertBotData("guild-3", {
      nickname: "new-bot",
      defaultImages: '{"hug":"https://example.com/hug.png"}',
    });

    expect((drizzleDb.update as any).mock.calls.length).toBe(1);
    expect(result.nickname).toBe("new-bot");
    expect(result.defaultImages).toEqual({
      hug: "https://example.com/hug.png",
    });
  });
});
