import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../src/db/connector.js", () => ({
  drizzleDb: {
    delete: vi.fn(() => ({ where: () => Promise.resolve() })),
  },
}));
vi.mock("../../src/db/schema.js", () => ({
  actionData: {},
}));

import userDataHandler from "../../src/http/api/userData.js";
import { drizzleDb } from "../../src/db/connector.js";
import { actionData } from "../../src/db/schema.js";

function makeReq(method: string, url: string) {
  return {
    method,
    url,
    headers: { host: "localhost" },
    on: (_: any, _cb: any) => {
      /* no body expected */
    },
  } as any;
}

function makeRes() {
  return {
    writeHead: vi.fn(),
    end: vi.fn(),
  } as any;
}

describe("userDataHandler DELETE", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("delete without userId returns 400", async () => {
    const req = makeReq("DELETE", "/api/userData");
    const res = makeRes();
    await userDataHandler(req, res);
    expect(res.writeHead).toHaveBeenCalledWith(400, {
      "Content-Type": "application/json",
    });
    expect(res.end).toHaveBeenCalledWith(
      JSON.stringify({ error: "missing_userId" }),
    );
  });

  it("deletes actionData rows for user", async () => {
    const req = makeReq("DELETE", "/api/userData?userId=u1");
    const res = makeRes();

    await userDataHandler(req, res);

    expect(drizzleDb.delete as any).toHaveBeenCalledTimes(1);
    expect((drizzleDb.delete as any).mock.calls[0][0]).toBe(actionData);
    expect(res.writeHead).toHaveBeenCalledWith(200, {
      "Content-Type": "application/json",
    });
    expect(res.end).toHaveBeenCalledWith(JSON.stringify({ ok: true }));
  });
});
