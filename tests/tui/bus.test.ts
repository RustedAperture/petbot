import { vi, describe, it, expect } from "vitest";
import { metrics } from "../../src/tui/bus.js";

describe("tui bus metrics", () => {
  it("emits and receives events", async () => {
    await new Promise<void>((resolve) => {
      metrics.once("test-event", (payload) => {
        expect(payload).toBe(123);
        resolve();
      });

      metrics.emit("test-event", 123);
    });
  });
});
