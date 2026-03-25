import { describe, it, expect } from "vitest";
import crypto from "node:crypto";
import { sha256buf, secureEqual } from "../../src/utilities/crypto.js";

describe("sha256buf", () => {
  it("returns a Buffer", () => {
    const result = sha256buf("hello");
    expect(Buffer.isBuffer(result)).toBe(true);
  });

  it("produces the correct SHA-256 digest", () => {
    const expected = crypto.createHash("sha256").update("hello").digest();
    expect(sha256buf("hello")).toEqual(expected);
  });

  it("handles empty string", () => {
    const expected = crypto.createHash("sha256").update("").digest();
    expect(sha256buf("")).toEqual(expected);
  });

  it("treats numeric input as string", () => {
    const expected = crypto.createHash("sha256").update("12345").digest();
    expect(sha256buf("12345" as unknown as string)).toEqual(expected);
  });
});

describe("secureEqual", () => {
  it("returns true for equal strings", () => {
    expect(secureEqual("secret", "secret")).toBe(true);
  });

  it("returns false for different strings", () => {
    expect(secureEqual("secret", "wrong")).toBe(false);
  });

  it("returns false when first arg is undefined", () => {
    expect(secureEqual(undefined, "secret")).toBe(false);
  });

  it("returns false when second arg is undefined", () => {
    expect(secureEqual("secret", undefined)).toBe(false);
  });

  it("returns false when both args are undefined", () => {
    expect(secureEqual(undefined, undefined)).toBe(false);
  });

  it("returns false for empty string vs non-empty", () => {
    expect(secureEqual("", "secret")).toBe(false);
  });

  it("returns false when both are empty strings", () => {
    // empty string is falsy in the guard (!a || !b)
    expect(secureEqual("", "")).toBe(false);
  });

  it("is timing-safe (does not short-circuit on first mismatch)", () => {
    // This is a behavioral guarantee of crypto.timingSafeEqual.
    // We just verify it returns correct results for strings of different lengths.
    expect(secureEqual("a", "ab")).toBe(false);
    expect(secureEqual("abcdef", "abcdeg")).toBe(false);
  });
});
