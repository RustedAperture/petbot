import { describe, it, expect } from "vitest";
import {
  isAdminOrOwnerGuild,
  getDiscordGuildIconUrl,
} from "@/lib/utils";

describe("isAdminOrOwnerGuild utility", () => {
  it("returns true for owner guilds", () => {
    expect(isAdminOrOwnerGuild({ owner: true })).toBe(true);
  });

  it("returns true when permissions include administrator bit", () => {
    expect(isAdminOrOwnerGuild({ permissions: "8" })).toBe(true);
    // admin bit plus extra bits should still be true
    expect(isAdminOrOwnerGuild({ permissions: "24" })).toBe(true);
  });

  it("returns false when permissions does not include administrator bit", () => {
    expect(isAdminOrOwnerGuild({ permissions: "0" })).toBe(false);
    expect(isAdminOrOwnerGuild({ permissions: "2" })).toBe(false);
    expect(isAdminOrOwnerGuild({ permissions: "1024" })).toBe(false);
  });

  it("returns false when permissions is missing or invalid", () => {
    expect(isAdminOrOwnerGuild({})).toBe(false);
    expect(isAdminOrOwnerGuild({ permissions: null })).toBe(false);
    expect(isAdminOrOwnerGuild({ permissions: "not-numeric" })).toBe(false);
  });

  it("builds a discord guild icon URL", () => {
    expect(getDiscordGuildIconUrl("123", "abc")).toBe(
      "https://cdn.discordapp.com/icons/123/abc.png?size=64",
    );
    expect(getDiscordGuildIconUrl("123", "a_abc")).toBe(
      "https://cdn.discordapp.com/icons/123/a_abc.gif?size=64",
    );
    expect(getDiscordGuildIconUrl("123", null)).toBeNull();
    expect(getDiscordGuildIconUrl("", "abc")).toBeNull();
  });
});
