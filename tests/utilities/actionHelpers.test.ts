import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@utils/check_user.js", () => ({ checkUser: vi.fn() }));
vi.mock("../../src/db/connector.js", () => ({
  drizzleDb: {
    select: vi.fn(() => ({
      from: (_t: any) => ({
        where: () => ({
          then: (r: any) => r([]),
          limit: () => Promise.resolve([]),
        }),
      }),
    })),
    update: vi.fn(() => ({
      set: vi.fn(() => ({ where: vi.fn().mockResolvedValue(undefined) })),
    })),
  },
}));
vi.mock("../../src/db/schema.js", () => ({ actionData: {}, botData: {} }));
vi.mock("../../src/utilities/actionEvents.js", () => ({
  recordActionEvent: vi.fn().mockResolvedValue({}),
}));
vi.mock("../../src/logger.js", () => ({
  default: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));
vi.mock("@utils/helper.js", () => ({ randomImage: vi.fn() }));
vi.mock("../../src/components/buildActionReply.js", () => ({
  buildActionReply: vi.fn(),
}));
vi.mock("../../src/components/buildStatsReply.js", () => ({
  buildStatsReply: vi.fn(),
}));

import {
  performAction,
  getActionStatsContainer,
} from "../../src/utilities/actionHelpers.js";
import { drizzleDb } from "../../src/db/connector.js";
import { recordActionEvent } from "../../src/utilities/actionEvents.js";
import { randomImage } from "../../src/utilities/helper.js";
import { buildActionReply } from "../../src/components/buildActionReply.js";
import { resolveBuiltIn } from "../../src/utilities/customActions/resolver.js";
import { buildStatsReply } from "../../src/components/buildStatsReply.js";

describe("actionHelpers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function arrangePerform() {
    const targetRow = { id: 11, images: ["img"], hasReceived: 1 };
    const authorRow = { id: 22, images: ["img"], hasPerformed: 2 };
    const rows = [
      [targetRow],
      [authorRow],
      [],
      [{ ...targetRow, hasReceived: 2 }],
    ];
    for (const r of rows) {
      (drizzleDb as any).select.mockImplementationOnce(() => ({
        from: () => ({
          where: () => ({
            then: (cb: any) => cb(r),
            limit: () => Promise.resolve(r),
          }),
        }),
      }));
    }
    (drizzleDb as any).update.mockImplementation(() => ({
      set: vi.fn(() => ({ where: vi.fn().mockResolvedValue(undefined) })),
    }));
    (randomImage as any).mockReturnValue("img");
    (buildActionReply as any).mockReturnValue("container");
  }

  it("performAction sets updatedAt on both counters and records one event", async () => {
    arrangePerform();
    await performAction(
      resolveBuiltIn("pet"),
      { id: "t" } as any,
      { id: "a" } as any,
      "g1",
    );
    const sets = (drizzleDb.update as any).mock.results.map(
      (r: any) => r.value.set.mock.calls[0][0],
    );
    expect(sets).toHaveLength(2);
    for (const s of sets) {
      expect(typeof s.updatedAt).toBe("string");
    }
    expect(recordActionEvent).toHaveBeenCalledTimes(1);
    expect(recordActionEvent).toHaveBeenCalledWith({
      actionType: "pet",
      performerId: "a",
      targetId: "t",
      locationId: "g1",
    });
  });

  it("custom action replies with its phrase and the target image, and records the phrase", async () => {
    arrangePerform();
    (drizzleDb as any).select.mockReset();
    const rows = [
      [{ id: 11, images: ["t.png"], hasReceived: 1 }],
      [{ id: 22, images: [], hasPerformed: 2 }],
      [],
      [{ id: 11, images: ["t.png"], hasReceived: 2 }],
    ];
    for (const r of rows) {
      (drizzleDb as any).select.mockImplementationOnce(() => ({
        from: () => ({
          where: () => ({
            then: (cb: any) => cb(r),
            limit: () => Promise.resolve(r),
          }),
        }),
      }));
    }
    (randomImage as any).mockImplementation((u: any) => u.images[0]);
    const custom = {
      name: "boop",
      phrase: "booped",
      isBuiltIn: false,
      sources: ["guild" as const],
      imageSource: "custom" as const,
      definitionImages: { guild: "g.png" },
    };
    await performAction(custom, { id: "t" } as any, { id: "a" } as any, "g1");
    expect(buildActionReply).toHaveBeenCalledWith(
      { id: "t" },
      { id: "a" },
      "g1",
      custom,
      "t.png",
      2,
    );
    expect(recordActionEvent).toHaveBeenCalledWith({
      actionType: "boop",
      performerId: "a",
      targetId: "t",
      locationId: "g1",
      phrase: "booped",
    });
  });

  it("custom action ignores null image slots when picking", async () => {
    arrangePerform();
    (drizzleDb as any).select.mockReset();
    const rows = [
      [{ id: 11, images: [null, "t.png"], hasReceived: 1 }],
      [{ id: 22, images: [], hasPerformed: 2 }],
      [],
      [{ id: 11, images: [null, "t.png"], hasReceived: 2 }],
    ];
    for (const r of rows) {
      (drizzleDb as any).select.mockImplementationOnce(() => ({
        from: () => ({
          where: () => ({
            then: (cb: any) => cb(r),
            limit: () => Promise.resolve(r),
          }),
        }),
      }));
    }
    (randomImage as any).mockImplementation((u: any) => u.images[0]);
    const custom = {
      name: "boop",
      phrase: "booped",
      isBuiltIn: false,
      sources: ["guild" as const],
      imageSource: "custom" as const,
      definitionImages: {},
      personalOwnerIds: [],
    };
    await performAction(custom, { id: "t" } as any, { id: "a" } as any, "g1");
    expect((buildActionReply as any).mock.calls[0][4]).toBe("t.png");
  });

  it("performAction still returns the reply when recording the event fails", async () => {
    arrangePerform();
    (recordActionEvent as any).mockRejectedValueOnce(new Error("db down"));
    await expect(
      performAction(resolveBuiltIn("pet"), { id: "t" } as any, { id: "a" } as any, "g1"),
    ).resolves.toBe("container");
  });

  it("performAction resolves while the event write is still pending", async () => {
    arrangePerform();
    (recordActionEvent as any).mockReturnValueOnce(new Promise(() => {}));
    await expect(
      performAction(resolveBuiltIn("pet"), { id: "t" } as any, { id: "a" } as any, "g1"),
    ).resolves.toBe("container");
  });

  it("performAction increments counters and returns built reply", async () => {
    const targetRow = {
      id: 11,
      images: ["img"],
      hasReceived: 1,
    };
    const authorRow = {
      id: 22,
      images: ["img"],
      hasPerformed: 2,
    };

    (drizzleDb as any).select
      .mockImplementationOnce(() => ({
        from: (_: any) => ({
          where: (_: any) => ({
            then: (r: any) => r([targetRow]),
            limit: () => Promise.resolve([targetRow]),
          }),
        }),
      }))
      .mockImplementationOnce(() => ({
        from: (_: any) => ({
          where: (_: any) => ({
            then: (r: any) => r([authorRow]),
            limit: () => Promise.resolve([authorRow]),
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
      }))
      .mockImplementationOnce(() => ({
        from: (_: any) => ({
          where: (_: any) => ({
            then: (r: any) => r([{ ...targetRow, hasReceived: 2 }]),
            limit: () => Promise.resolve([{ ...targetRow, hasReceived: 2 }]),
          }),
        }),
      }));

    (drizzleDb as any).update.mockImplementation(() => ({
      set: vi.fn(() => ({ where: vi.fn().mockResolvedValue(undefined) })),
    }));

    (randomImage as any).mockReturnValue("img");
    (buildActionReply as any).mockReturnValue("container");

    const res = await performAction(
      resolveBuiltIn("pet"),
      { id: "t" } as any,
      { id: "a" } as any,
      "g1",
    );

    expect((drizzleDb as any).update).toHaveBeenCalled();
    expect(buildActionReply).toHaveBeenCalled();
    expect(res).toBe("container");
  });

  it("uses guild default images when restricted mode is enabled", async () => {
    const targetRow = {
      id: 11,
      images: ["img"],
      hasReceived: 1,
    };
    const authorRow = {
      id: 22,
      images: ["img"],
      hasPerformed: 2,
    };

    (drizzleDb as any).select
      .mockImplementationOnce(() => ({
        from: (_: any) => ({
          where: (_: any) => ({
            then: (r: any) => r([targetRow]),
            limit: () => Promise.resolve([targetRow]),
          }),
        }),
      }))
      .mockImplementationOnce(() => ({
        from: (_: any) => ({
          where: (_: any) => ({
            then: (r: any) => r([authorRow]),
            limit: () => Promise.resolve([authorRow]),
          }),
        }),
      }))
      .mockImplementationOnce(() => ({
        from: (_: any) => ({
          where: (_: any) => ({
            then: (r: any) =>
              r([
                {
                  restricted: true,
                  defaultImages: { pet: "https://example.com/restricted.png" },
                },
              ]),
            limit: () =>
              Promise.resolve([
                {
                  restricted: true,
                  defaultImages: { pet: "https://example.com/restricted.png" },
                },
              ]),
          }),
        }),
      }))
      .mockImplementationOnce(() => ({
        from: (_: any) => ({
          where: (_: any) => ({
            then: (r: any) => r([{ ...targetRow, hasReceived: 2 }]),
            limit: () => Promise.resolve([{ ...targetRow, hasReceived: 2 }]),
          }),
        }),
      }));

    (drizzleDb as any).update.mockImplementation(() => ({
      set: vi.fn(() => ({ where: vi.fn().mockResolvedValue(undefined) })),
    }));

    (randomImage as any).mockReturnValue("img");
    (buildActionReply as any).mockReturnValue("container");

    await performAction(
      resolveBuiltIn("pet"),
      { id: "t" } as any,
      { id: "a" } as any,
      "g1",
    );

    expect(randomImage).toHaveBeenCalledWith(
      expect.objectContaining({
        images: ["https://example.com/restricted.png"],
      }),
    );
  });

  it("getActionStatsContainer returns built stats reply when row exists", async () => {
    const row = { id: 99, images: ["img"], hasReceived: 7 };
    (drizzleDb as any).select
      .mockImplementationOnce(() => ({
        from: (_: any) => ({
          where: (_: any) => ({
            then: (r: any) => r([row]),
            limit: () => Promise.resolve([row]),
          }),
        }),
      }))
      .mockImplementationOnce(() => ({
        from: (_: any) => ({
          where: (_: any) => ({
            then: (r: any) => r([{ s: 7 }]),
            limit: () => Promise.resolve([{ s: 7 }]),
          }),
        }),
      }));

    (buildStatsReply as any).mockReturnValue("statsContainer");

    const res = await getActionStatsContainer(
      resolveBuiltIn("pet"),
      { id: "t" } as any,
      "g1",
    );
    expect(buildStatsReply).toHaveBeenCalled();
    expect(res).toBe("statsContainer");
  });
});
