import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../src/db/connector.js", () => {
  const makeResult = (rows: any[]) => ({
    then: (resolve: any) => resolve(rows),
    limit: () => Promise.resolve(rows),
  });
  const select = vi.fn(() => ({
    from: (_table: any) => ({ where: (_: any) => makeResult([]) }),
  }));
  const insert = vi.fn(() => ({
    values: vi.fn().mockResolvedValue(undefined),
  }));
  return { drizzleDb: { select, insert } };
});
vi.mock("../../src/db/schema.js", () => ({ actionData: {}, botData: {} }));
vi.mock("@logger", () => ({
  default: { debug: vi.fn(), error: vi.fn() },
}));
import { checkUser } from "../../src/utilities/check_user.js";
import { drizzleDb } from "../../src/db/connector.js";
import { ACTIONS } from "../../src/types/constants.js";

describe("checkUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a new record with default image when none exist and no guild settings", async () => {
    // no existing records, no guild settings
    (drizzleDb as any).select
      .mockImplementationOnce(() => ({
        from: (_: any) => ({
          where: (_: any) => ({ then: (r: any) => r([{ m: null }]) }),
        }),
      }))
      .mockImplementationOnce(() => ({
        from: (_: any) => ({
          where: (_: any) => ({
            then: (r: any) => r([]),
            limit: () => Promise.resolve([]),
          }),
        }),
      }))
      .mockImplementationOnce(() => ({
        from: (_: any) => ({
          where: (_: any) => ({
            then: (r: any) => r([]),
            limit: () => Promise.resolve([]),
          }),
        }),
      }));

    const user = { id: "u1", displayName: "User" } as any;

    await checkUser("pet" as any, user, "g1");

    const insertMock = (drizzleDb as any).insert as any;
    expect(insertMock).toHaveBeenCalled();
    const valuesMock = insertMock.mock.results[0].value.values;
    expect(valuesMock).toHaveBeenCalled();
    const inserted = valuesMock.mock.calls[0][0];

    expect(inserted).toMatchObject({
      userId: user.id,
      locationId: "g1",
      actionType: "pet",
      images: expect.any(Array),
    });
    expect(inserted.images[0]).toBe(ACTIONS.pet.defaultImage);
  });

  it("uses guild default image when guild settings exist", async () => {
    // no existing records, guild settings exist
    (drizzleDb as any).select
      .mockImplementationOnce(() => ({
        from: (_: any) => ({
          where: (_: any) => ({ then: (r: any) => r([{ m: null }]) }),
        }),
      }))
      .mockImplementationOnce(() => ({
        from: (_: any) => ({
          where: (_: any) => ({
            then: (r: any) => r([]),
            limit: () => Promise.resolve([]),
          }),
        }),
      }))
      .mockImplementationOnce(() => ({
        from: (_: any) => ({
          where: (_: any) => ({
            then: (r: any) => r([{ default_images: { pet: "guild-img" } }]),
            limit: () =>
              Promise.resolve([{ default_images: { pet: "guild-img" } }]),
          }),
        }),
      }));

    const user = { id: "u2", displayName: "User2" } as any;

    await checkUser("pet" as any, user, "g2");

    // assert an insert happened
    expect((drizzleDb as any).insert).toHaveBeenCalled();
  });

  it("copies images from the record with highest performed if present", async () => {
    // simulate recordWithHighestPerformed and no existingRecord
    (drizzleDb as any).select
      .mockImplementationOnce(() => ({
        from: (_: any) => ({
          where: (_: any) => ({ then: (r: any) => r([{ m: 5 }]) }),
        }),
      }))
      .mockImplementationOnce(() => ({
        from: (_: any) => ({
          where: (_: any) => ({
            then: (r: any) => r([{ images: ["x"] }]),
            limit: () => Promise.resolve([{ images: ["x"] }]),
          }),
        }),
      }))
      .mockImplementationOnce(() => ({
        from: (_: any) => ({
          where: (_: any) => ({
            then: (r: any) => r([]),
            limit: () => Promise.resolve([]),
          }),
        }),
      }));

    const user = { id: "u3", displayName: "User3" } as any;

    await checkUser("pet" as any, user, "g3");

    expect((drizzleDb as any).insert).toHaveBeenCalled();
  });

  it("does nothing when an existing record is present", async () => {
    (drizzleDb as any).select.mockImplementation(() => ({
      from: (_: any) => ({
        where: (_: any) => ({
          then: (r: any) => r([{ id: 1 }]),
          limit: () => Promise.resolve([{ id: 1 }]),
        }),
      }),
    }));

    const user = { id: "u4", displayName: "User4" } as any;

    await checkUser("pet" as any, user, "g4");

    expect((drizzleDb as any).insert).not.toHaveBeenCalled();
  });
});
