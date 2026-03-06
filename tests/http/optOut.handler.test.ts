import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../src/db/connector.js", () => ({
  drizzleDb: {
    select: vi.fn(() => ({
      from: () => ({ where: () => ({ limit: () => Promise.resolve([]) }) }),
    })),
    insert: vi.fn(() => ({
      values: () => ({ onConflictDoUpdate: () => Promise.resolve() }),
    })),
    delete: vi.fn(() => ({ where: () => Promise.resolve() })),
  },
}));
vi.mock("../../src/db/schema.js", () => ({ optOut: {} }));
vi.mock("../../src/logger.js", () => ({
  default: { info: vi.fn(), error: vi.fn() },
}));

import optOutHandler from "../../src/http/api/optOut.js";
import { drizzleDb } from "../../src/db/connector.js";
import { optOut } from "../../src/db/schema.js";

function makeReq(method: string, url: string) {
  return {
    method,
    url,
    headers: { host: "localhost" },
    on: (_: any, _cb: any) => {},
  } as any;
}

function makeRes() {
  return { writeHead: vi.fn(), end: vi.fn() } as any;
}

describe("optOutHandler GET", () => {
  beforeEach(() => vi.clearAllMocks());

  it("missing userId → 400", async () => {
    const res = makeRes();
    await optOutHandler(makeReq("GET", "/api/optOut"), res);
    expect(res.writeHead).toHaveBeenCalledWith(400, {
      "Content-Type": "application/json",
    });
    expect(res.end).toHaveBeenCalledWith(
      JSON.stringify({ error: "missing_userId" }),
    );
  });

  it("no row → optedOut false", async () => {
    const res = makeRes();
    await optOutHandler(makeReq("GET", "/api/optOut?userId=u1"), res);
    expect(res.writeHead).toHaveBeenCalledWith(200, {
      "Content-Type": "application/json",
    });
    expect(res.end).toHaveBeenCalledWith(JSON.stringify({ optedOut: false }));
  });

  it("existing row → optedOut true", async () => {
    (drizzleDb.select as any).mockReturnValueOnce({
      from: () => ({
        where: () => ({ limit: () => Promise.resolve([{ userId: "u1" }]) }),
      }),
    });
    const res = makeRes();
    await optOutHandler(makeReq("GET", "/api/optOut?userId=u1"), res);
    expect(res.end).toHaveBeenCalledWith(JSON.stringify({ optedOut: true }));
  });
});

describe("optOutHandler POST", () => {
  beforeEach(() => vi.clearAllMocks());

  it("missing userId → 400", async () => {
    const res = makeRes();
    await optOutHandler(makeReq("POST", "/api/optOut"), res);
    expect(res.writeHead).toHaveBeenCalledWith(400, {
      "Content-Type": "application/json",
    });
  });

  it("inserts or upserts row", async () => {
    const res = makeRes();
    await optOutHandler(makeReq("POST", "/api/optOut?userId=u2"), res);
    expect(drizzleDb.insert as any).toHaveBeenCalledWith(optOut);
    expect(res.writeHead).toHaveBeenCalledWith(200, {
      "Content-Type": "application/json",
    });
    expect(res.end).toHaveBeenCalledWith(JSON.stringify({ ok: true }));
  });
});

describe("optOutHandler DELETE", () => {
  beforeEach(() => vi.clearAllMocks());

  it("missing userId → 400", async () => {
    const res = makeRes();
    await optOutHandler(makeReq("DELETE", "/api/optOut"), res);
    expect(res.writeHead).toHaveBeenCalledWith(400, {
      "Content-Type": "application/json",
    });
  });

  it("removes row", async () => {
    const res = makeRes();
    await optOutHandler(makeReq("DELETE", "/api/optOut?userId=u3"), res);
    expect(drizzleDb.delete as any).toHaveBeenCalledWith(optOut);
    expect(res.end).toHaveBeenCalledWith(JSON.stringify({ ok: true }));
  });
});

describe("optOutHandler method_not_allowed", () => {
  it("PUT → 405", async () => {
    const res = makeRes();
    await optOutHandler(makeReq("PUT", "/api/optOut?userId=u1"), res);
    expect(res.writeHead).toHaveBeenCalledWith(405, {
      "Content-Type": "application/json",
    });
  });
});
