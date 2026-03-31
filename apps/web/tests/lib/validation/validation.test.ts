import { describe, it, expect } from "vitest";
import {
  discordIdSchema,
  userIdParam,
  guildIdParam,
  userGuildParams,
  userLocationParams,
  setImagesBody,
  serverSettingsBody,
} from "@/lib/validation";

describe("discordIdSchema", () => {
  it("accepts valid numeric Discord IDs", () => {
    expect(discordIdSchema.parse("123456789")).toBe("123456789");
    expect(discordIdSchema.parse("0")).toBe("0");
  });

  it("rejects non-numeric strings", () => {
    expect(() => discordIdSchema.parse("abc")).toThrow();
    expect(() => discordIdSchema.parse("123abc")).toThrow();
    expect(() => discordIdSchema.parse("")).toThrow();
  });
});

describe("userIdParam", () => {
  it("parses valid userId", () => {
    expect(userIdParam.parse({ userId: "123" })).toEqual({ userId: "123" });
  });

  it("rejects invalid userId", () => {
    expect(() => userIdParam.parse({ userId: "abc" })).toThrow();
    expect(() => userIdParam.parse({})).toThrow();
  });
});

describe("guildIdParam", () => {
  it("parses valid guildId", () => {
    expect(guildIdParam.parse({ guildId: "456" })).toEqual({ guildId: "456" });
  });

  it("rejects invalid guildId", () => {
    expect(() => guildIdParam.parse({ guildId: "" })).toThrow();
  });
});

describe("userGuildParams", () => {
  it("parses valid userId + guildId", () => {
    expect(userGuildParams.parse({ userId: "123", guildId: "456" })).toEqual({
      userId: "123",
      guildId: "456",
    });
  });

  it("rejects when missing fields", () => {
    expect(() => userGuildParams.parse({ userId: "123" })).toThrow();
  });
});

describe("userLocationParams", () => {
  it("parses valid userId + locationId", () => {
    expect(
      userLocationParams.parse({ userId: "123", locationId: "789" }),
    ).toEqual({ userId: "123", locationId: "789" });
  });
});

describe("setImagesBody", () => {
  it("parses a valid setImages body with guildId", () => {
    const result = setImagesBody.parse({
      guildId: "123",
      actionType: "pet",
      images: ["https://example.com/img.png"],
      everywhere: false,
    });
    expect(result.guildId).toBe("123");
    expect(result.actionType).toBe("pet");
  });

  it("parses a valid setImages body with everywhere=true and no guildId", () => {
    const result = setImagesBody.parse({
      actionType: "pet",
      images: [""],
      everywhere: true,
    });
    expect(result.everywhere).toBe(true);
  });

  it("rejects when everywhere=false and no guildId", () => {
    expect(() =>
      setImagesBody.parse({
        actionType: "pet",
        images: [],
        everywhere: false,
      }),
    ).toThrow();
  });

  it("rejects invalid actionType", () => {
    expect(() =>
      setImagesBody.parse({
        guildId: "123",
        actionType: "invalid_action",
        images: [],
      }),
    ).toThrow();
  });

  it("rejects non-HTTP URLs in images", () => {
    expect(() =>
      setImagesBody.parse({
        guildId: "123",
        actionType: "pet",
        images: ["ftp://bad.com/img.png"],
      }),
    ).toThrow();
  });

  it("allows empty strings in images array", () => {
    const result = setImagesBody.parse({
      guildId: "123",
      actionType: "pet",
      images: [""],
    });
    expect(result.images).toEqual([""]);
  });

  it("defaults everywhere to false", () => {
    const result = setImagesBody.parse({
      guildId: "123",
      actionType: "pet",
      images: [],
    });
    expect(result.everywhere).toBe(false);
  });
});

describe("serverSettingsBody", () => {
  it("accepts any plain object", () => {
    expect(serverSettingsBody.parse({ key: "value" })).toEqual({
      key: "value",
    });
  });

  it("rejects arrays", () => {
    expect(() => serverSettingsBody.parse([])).toThrow();
  });

  it("rejects null", () => {
    expect(() => serverSettingsBody.parse(null)).toThrow();
  });
});
