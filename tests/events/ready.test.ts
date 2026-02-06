import { vi, describe, it, expect, beforeEach } from "vitest";

vi.mock("../../src/utilities/db.js", () => ({ sequelize: { sync: vi.fn() } }));
import ready from "../../src/events/ready.js";
import { sequelize } from "../../src/utilities/db.js";
import logger from "../../src/logger.js";

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("ready event", () => {
  it("syncs sequelize and logs ready message", () => {
    const spy = vi.spyOn(logger as any, "info").mockImplementation(() => {});

    const client: any = { user: { tag: "bot#1" } };

    ready.execute(client as any);

    expect((sequelize as any).sync).toHaveBeenCalled();
    expect(spy).toHaveBeenCalledWith("Ready! Logged in as bot#1");
  });
});
