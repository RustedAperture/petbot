import { describe, it, expect, vi, beforeEach } from "vitest";
import { adaptLegacy } from "../../src/http/adapters.js";

function makeReq(overrides: Record<string, unknown> = {}) {
  return {
    method: "GET",
    url: "/api/test",
    headers: { host: "localhost" },
    socket: { remoteAddress: "127.0.0.1" },
    ...overrides,
  } as any;
}

function makeRes() {
  return {
    writeHead: vi.fn(),
    end: vi.fn(),
    status: vi.fn().mockReturnThis(),
    json: vi.fn(),
  } as any;
}

describe("adaptLegacy", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("calls the legacy handler with req and res", async () => {
    const legacyHandler = vi.fn().mockResolvedValue(undefined);
    const wrapped = adaptLegacy(legacyHandler);

    const req = makeReq();
    const res = makeRes();
    const next = vi.fn();

    await wrapped(req, res, next);

    expect(legacyHandler).toHaveBeenCalledTimes(1);
    expect(legacyHandler).toHaveBeenCalledWith(req, res);
    expect(next).not.toHaveBeenCalled();
  });

  it("forwards extra arguments to the legacy handler", async () => {
    const legacyHandler = vi.fn().mockResolvedValue(undefined);
    const client = { id: "bot-123" };
    const wrapped = adaptLegacy(legacyHandler, client);

    const req = makeReq();
    const res = makeRes();
    const next = vi.fn();

    await wrapped(req, res, next);

    expect(legacyHandler).toHaveBeenCalledWith(req, res, client);
  });

  it("forwards multiple extra arguments", async () => {
    const legacyHandler = vi.fn().mockResolvedValue(undefined);
    const wrapped = adaptLegacy(legacyHandler, "arg1", "arg2");

    const req = makeReq();
    const res = makeRes();
    const next = vi.fn();

    await wrapped(req, res, next);

    expect(legacyHandler).toHaveBeenCalledWith(req, res, "arg1", "arg2");
  });

  it("calls next with error when legacy handler throws", async () => {
    const error = new Error("handler failed");
    const legacyHandler = vi.fn().mockRejectedValue(error);
    const wrapped = adaptLegacy(legacyHandler);

    const req = makeReq();
    const res = makeRes();
    const next = vi.fn();

    await wrapped(req, res, next);

    expect(next).toHaveBeenCalledWith(error);
  });

  it("calls next with error when legacy handler throws synchronously", async () => {
    const error = new Error("sync error");
    const legacyHandler = vi.fn().mockImplementation(() => {
      throw error;
    });
    const wrapped = adaptLegacy(legacyHandler);

    const req = makeReq();
    const res = makeRes();
    const next = vi.fn();

    await wrapped(req, res, next);

    expect(next).toHaveBeenCalledWith(error);
  });

  it("handles legacy handlers that return void (not a promise)", async () => {
    const legacyHandler = vi.fn().mockReturnValue(undefined);
    const wrapped = adaptLegacy(legacyHandler);

    const req = makeReq();
    const res = makeRes();
    const next = vi.fn();

    await wrapped(req, res, next);

    expect(legacyHandler).toHaveBeenCalledTimes(1);
    expect(next).not.toHaveBeenCalled();
  });
});
