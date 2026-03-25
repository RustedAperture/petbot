import { describe, it, expect } from "vitest";
import { getScopeDisplay } from "@/components/user-stats-selector";

describe("getScopeDisplay", () => {
  const guilds = [
    { id: "123", name: "GuildAlpha" },
    { id: "456", name: "GuildBeta" },
  ];

  it("returns the input unchanged when no matching guild exists", () => {
    expect(getScopeDisplay("foo", guilds)).toBe("foo");
    expect(getScopeDisplay("", guilds)).toBe("");
  });

  it("returns the guild name when the value matches a guild id", () => {
    expect(getScopeDisplay("123", guilds)).toBe("GuildAlpha");
    expect(getScopeDisplay("456", guilds)).toBe("GuildBeta");
  });

  it("continues to return the same string when guild list is empty", () => {
    expect(getScopeDisplay("123", [])).toBe("123");
  });
});
