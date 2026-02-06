import { describe, it, expect } from "vitest";
import { normalizeUrl } from "@utils/normalizeUrl.js";

describe("normalizeUrl", () => {
  it("returns same value for empty input", () => {
    expect(normalizeUrl("")).toBe("");
  });

  it("replaces lookalike characters", () => {
    expect(normalizeUrl("һttp：／／example.com")).toMatch(
      /^http:\/\/example.com/,
    );
  });
});
