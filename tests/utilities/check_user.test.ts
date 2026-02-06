import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@utils/db.js", () => ({
  ActionData: {
    max: vi.fn(),
    findOne: vi.fn(),
    create: vi.fn(),
  },
  BotData: { findOne: vi.fn() },
}));
vi.mock("@logger", () => ({
  default: { debug: vi.fn(), error: vi.fn() },
}));
import { checkUser } from "@utils/check_user.js";
import { ActionData, BotData } from "@utils/db.js";
import { ACTIONS } from "../../src/types/constants.js";

describe("checkUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a new record with default image when none exist and no guild settings", async () => {
    (ActionData.max as any).mockResolvedValue(null);
    (ActionData.findOne as any).mockResolvedValue(null);
    (BotData.findOne as any).mockResolvedValue(null);

    const user = { id: "u1", displayName: "User" } as any;

    await checkUser("pet" as any, user, "g1");

    expect(ActionData.create).toHaveBeenCalled();
    const created = (ActionData.create as any).mock.calls[0][0];
    expect(created.user_id).toBe("u1");
    expect(created.images[0]).toBe(ACTIONS.pet.defaultImage);
  });

  it("uses guild default image when guild settings exist", async () => {
    (ActionData.max as any).mockResolvedValue(null);
    (ActionData.findOne as any).mockResolvedValue(null);
    (BotData.findOne as any).mockResolvedValue({
      get: vi.fn().mockReturnValue("guild-img"),
    });

    const user = { id: "u2", displayName: "User2" } as any;

    await checkUser("pet" as any, user, "g2");

    const created = (ActionData.create as any).mock.calls[0][0];
    expect(created.images[0]).toBe("guild-img");
  });

  it("copies images from the record with highest performed if present", async () => {
    (ActionData.max as any).mockResolvedValue(5);
    (ActionData.findOne as any)
      .mockResolvedValueOnce({ images: ["x"] }) // recordWithHighestPerformed
      .mockResolvedValueOnce(null); // existingRecord

    (BotData.findOne as any).mockResolvedValue(null);

    const user = { id: "u3", displayName: "User3" } as any;

    await checkUser("pet" as any, user, "g3");

    const created = (ActionData.create as any).mock.calls[0][0];
    expect(created.images).toEqual(["x"]);
  });

  it("does nothing when an existing record is present", async () => {
    (ActionData.findOne as any).mockResolvedValue({ id: 1 });

    const user = { id: "u4", displayName: "User4" } as any;

    await checkUser("pet" as any, user, "g4");

    expect(ActionData.create).not.toHaveBeenCalled();
  });
});
