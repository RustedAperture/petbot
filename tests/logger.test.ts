import { vi, describe, it, expect, beforeEach } from "vitest";

beforeEach(() => { vi.restoreAllMocks(); });

describe("logger", () => {
  it("exposes log methods and doesn't throw", async () => {
    // @ts-ignore - module resolution for logger
    const { default: logger } = await import("../../src/logger.js");
    expect(typeof (logger as any).info).toBe("function");
    expect(typeof (logger as any).debug).toBe("function");

    // ensure calling doesn't throw
    (logger as any).info("test-log");
  });
});
