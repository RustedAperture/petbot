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
    update: vi.fn(() => ({ set: vi.fn() })),
  },
}));
vi.mock("../../src/db/schema.js", () => ({ actionData: {} }));
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
import { randomImage } from "../../src/utilities/helper.js";
import { buildActionReply } from "../../src/components/buildActionReply.js";
import { buildStatsReply } from "../../src/components/buildStatsReply.js";

describe("actionHelpers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
      "pet" as any,
      { id: "t" } as any,
      { id: "a" } as any,
      "g1",
    );

    expect((drizzleDb as any).update).toHaveBeenCalled();
    expect(buildActionReply).toHaveBeenCalled();
    expect(res).toBe("container");
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
      "pet" as any,
      { id: "t" } as any,
      "g1",
    );
    expect(buildStatsReply).toHaveBeenCalled();
    expect(res).toBe("statsContainer");
  });
});
