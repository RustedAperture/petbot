import { vi, describe, it, expect, beforeEach } from "vitest";
import logger from "../src/logger";

beforeEach(() => vi.restoreAllMocks());

describe("logger", () => {
  it("exposes log methods and doesn't throw", () => {
    expect(typeof (logger as any).info).toBe("function");
    expect(typeof (logger as any).debug).toBe("function");

    // ensure calling doesn't throw
    (logger as any).info("test-log");
  });
});
