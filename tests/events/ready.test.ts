import { vi, describe, it, expect, beforeEach } from "vitest";

import ready from "../../src/events/ready.js";
import logger from "../../src/logger.js";

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("ready event", () => {
  it("logs ready message", () => {
    const spy = vi.spyOn(logger as any, "info").mockImplementation(() => {});

    const client: any = { user: { tag: "bot#1" } };

    ready.execute(client as any);

    expect(spy).toHaveBeenCalledWith("Ready! Logged in as bot#1");
  });
});
