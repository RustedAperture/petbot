import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../src/tui/bus.js", () => ({ metrics: { emit: vi.fn() } }));
import { emitEvent, emitCommand } from "../../src/utilities/metrics.js";
import { metrics } from "../../src/tui/bus.js";

describe("metrics util", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("emitEvent calls metrics.emit", () => {
    emitEvent("my-event");
    expect(metrics.emit).toHaveBeenCalledWith("event", "my-event");
  });

  it("emitCommand prefixes cmd: and emits", () => {
    emitCommand("/foo");
    expect(metrics.emit).toHaveBeenCalledWith("event", "cmd:/foo");
  });

  it("does not throw when metrics.emit throws", () => {
    (metrics.emit as any).mockImplementation(() => {
      throw new Error("boom");
    });

    expect(() => emitEvent("x")).not.toThrow();
  });
});
