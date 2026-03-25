import { describe, it, expect } from "vitest";
import { computeTitle } from "@/components/app-header";

// computeTitle is pure logic; just verify a few scenarios.

describe("computeTitle", () => {
  it("returns stat menu title when active matches and not a special page", () => {
    expect(computeTitle("/guildStats", "Guild stats")).toBe("Guild stats");
  });

  it("falls back to PetBot when no active title and not special", () => {
    expect(computeTitle("/unknown")).toBe("PetBot");
  });

  it("returns Privacy Policy for /privacy even if activeTitle provided", () => {
    expect(computeTitle("/privacy", "Ignored")).toBe("Privacy Policy");
  });

  it("returns Terms of Service for /terms regardless", () => {
    expect(computeTitle("/terms")).toBe("Terms of Service");
  });
});
