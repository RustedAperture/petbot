import { vi, describe, it, expect, beforeEach } from "vitest";

vi.mock("../../src/utilities/db", () => ({ sequelize: { sync: vi.fn() } }));
import ready from "../../src/events/ready";
import { sequelize } from "../../src/utilities/db";
import logger from "../../src/logger";

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
