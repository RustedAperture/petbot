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

describe("checkUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a new record with no baked-in image so the live guild default applies", async () => {
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
      images: [],
    });
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
