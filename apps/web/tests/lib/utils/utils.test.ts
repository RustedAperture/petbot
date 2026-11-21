import { describe, it, expect } from "vitest";
import {
  canManageServerGuild,
  getDiscordGuildIconUrl,
} from "@/lib/utils";

describe("canManageServerGuild utility", () => {
  it.each([
    [{ owner: true }, true],
    [{ permissions: "8" }, true],
    [{ permissions: "32" }, true],
    [{ permissions: "1056" }, true],
    [{ permissions: "2" }, false],
    [{ permissions: null }, false],
    [{ permissions: "not-numeric" }, false],
  ])("%j -> %s", (guild, expected) => {
    expect(canManageServerGuild(guild)).toBe(expected);
  });
});

describe("getDiscordGuildIconUrl", () => {
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
