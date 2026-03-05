import { describe, it, expect, vi, beforeEach } from "vitest";

// mock connector and schema so we can spy on the delete calls
vi.mock("../../src/db/connector.js", () => ({
  drizzleDb: {
    delete: vi.fn(() => ({ where: () => Promise.resolve() })),
  },
}));
vi.mock("../../src/db/schema.js", () => ({
  userSessions: {},
  actionData: {},
}));

// import after applying mocks
import userSessionsHandler from "../../src/http/api/userSessions.js";
import { drizzleDb } from "../../src/db/connector.js";
import { userSessions } from "../../src/db/schema.js";

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

describe("userSessionsHandler DELETE", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("removes both session data rows", async () => {
    const req = makeReq("DELETE", "/api/userSessions?userId=abc123");
    const res = makeRes();

    await userSessionsHandler(req, res);

    // delete should be called only for the session table
    expect(drizzleDb.delete as any).toHaveBeenCalledTimes(1);
    expect((drizzleDb.delete as any).mock.calls[0][0]).toBe(userSessions);

    // response should indicate success
    expect(res.writeHead).toHaveBeenCalledWith(200, {
      "Content-Type": "application/json",
    });
    expect(res.end).toHaveBeenCalledWith(JSON.stringify({ ok: true }));
  });
});
