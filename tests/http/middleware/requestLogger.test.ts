import { describe, it, expect, vi, beforeEach } from "vitest";

const { infoMock } = vi.hoisted(() => ({
  infoMock: vi.fn(),
}));

vi.mock("../../../src/logger.js", () => ({
  default: {
    info: infoMock,
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

import { requestLogger } from "../../../src/http/middleware/requestLogger.js";

function makeReq(overrides: Record<string, unknown> = {}) {
  return {
    method: "GET",
    path: "/api/health",
    originalUrl: "/api/health",
    ...overrides,
  } as any;
}

function makeRes() {
  const listeners: Record<string, Function[]> = {};
  const res: any = {
    on(event: string, cb: Function) {
      (listeners[event] ??= []).push(cb);
    },
    _emit(event: string) {
      for (const cb of listeners[event] ?? []) {
        cb();
      }
    },
  };
  return res;
}

describe("requestLogger middleware", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("logs the incoming request", () => {
    const req = makeReq({
      method: "POST",
      path: "/api/stats",
      originalUrl: "/api/stats",
    });
    const res = makeRes();
    const next = vi.fn();

    requestLogger(req, res, next);

    expect(infoMock).toHaveBeenCalledWith(
      { method: "POST", pathname: "/api/stats" },
      "HTTP request",
    );
    expect(next).toHaveBeenCalled();
  });

  it("logs elapsed time on response finish", () => {
    const req = makeReq({ method: "GET", originalUrl: "/api/health" });
    const res = makeRes();
    const next = vi.fn();

    requestLogger(req, res, next);

    // Simulate the response finishing
    res._emit("finish");

    expect(infoMock).toHaveBeenCalledWith(
      expect.objectContaining({
        method: "GET",
        pathname: "/api/health",
        elapsed: expect.any(Number),
      }),
      "HTTP request handled",
    );
  });

  it("always calls next()", () => {
    const req = makeReq();
    const res = makeRes();
    const next = vi.fn();

    requestLogger(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
  });
});
