import { describe, it, expect, beforeEach } from "vitest";
import { readiness } from "../../src/http/readiness.js";

describe("readiness state", () => {
  beforeEach(() => {
    // Reset to default state
    readiness.botReady = false;
    readiness.dbReady = false;
  });

  it("starts with both flags false", () => {
    expect(readiness.botReady).toBe(false);
    expect(readiness.dbReady).toBe(false);
  });

  it("allows setting dbReady", () => {
    readiness.dbReady = true;
    expect(readiness.dbReady).toBe(true);
    expect(readiness.botReady).toBe(false);
  });

  it("allows setting botReady", () => {
    readiness.botReady = true;
    expect(readiness.botReady).toBe(true);
    expect(readiness.dbReady).toBe(false);
  });

  it("reflects both flags when both are set", () => {
    readiness.dbReady = true;
    readiness.botReady = true;
    expect(readiness.dbReady).toBe(true);
    expect(readiness.botReady).toBe(true);
  });
});
