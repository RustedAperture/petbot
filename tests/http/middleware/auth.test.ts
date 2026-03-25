import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../../src/utilities/crypto.js", () => ({
  secureEqual: vi.fn(),
}));

import { authMiddleware } from "../../../src/http/middleware/auth.js";
import { secureEqual } from "../../../src/utilities/crypto.js";

function makeReq(overrides: Record<string, unknown> = {}) {
  return {
    headers: {},
    socket: { remoteAddress: "127.0.0.1" },
    ...overrides,
  } as any;
}

function makeRes() {
  const res: any = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  };
  return res;
}

describe("authMiddleware", () => {
  const next = vi.fn();

  beforeEach(() => {
    vi.resetAllMocks();
    delete process.env.INTERNAL_API_SECRET;
  });

  describe("when INTERNAL_API_SECRET is set (secret mode)", () => {
    beforeEach(() => {
      process.env.INTERNAL_API_SECRET = "my-secret";
    });

    it("calls next() when x-internal-api-key matches", () => {
      (secureEqual as ReturnType<typeof vi.fn>).mockReturnValue(true);

      const req = makeReq({ headers: { "x-internal-api-key": "my-secret" } });
      const res = makeRes();

      authMiddleware(req, res, next);

      expect(secureEqual).toHaveBeenCalledWith("my-secret", "my-secret");
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it("calls next() when x-internal-secret matches", () => {
      (secureEqual as ReturnType<typeof vi.fn>).mockReturnValue(true);

      const req = makeReq({ headers: { "x-internal-secret": "my-secret" } });
      const res = makeRes();

      authMiddleware(req, res, next);

      expect(secureEqual).toHaveBeenCalledWith("my-secret", "my-secret");
      expect(next).toHaveBeenCalled();
    });

    it("prefers x-internal-api-key over x-internal-secret", () => {
      (secureEqual as ReturnType<typeof vi.fn>).mockReturnValue(true);

      const req = makeReq({
        headers: {
          "x-internal-api-key": "key-val",
          "x-internal-secret": "secret-val",
        },
      });
      const res = makeRes();

      authMiddleware(req, res, next);

      expect(secureEqual).toHaveBeenCalledWith("key-val", "my-secret");
    });

    it("returns 401 when no key header is present", () => {
      const req = makeReq({ headers: {} });
      const res = makeRes();

      authMiddleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: "unauthorized" });
      expect(next).not.toHaveBeenCalled();
    });

    it("returns 401 when key does not match", () => {
      (secureEqual as ReturnType<typeof vi.fn>).mockReturnValue(false);

      const req = makeReq({ headers: { "x-internal-api-key": "wrong" } });
      const res = makeRes();

      authMiddleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: "unauthorized" });
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe("when INTERNAL_API_SECRET is not set (localhost mode)", () => {
    it("calls next() for 127.0.0.1", () => {
      const req = makeReq({ socket: { remoteAddress: "127.0.0.1" } });
      const res = makeRes();

      authMiddleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it("calls next() for ::1 (IPv6 localhost)", () => {
      const req = makeReq({ socket: { remoteAddress: "::1" } });
      const res = makeRes();

      authMiddleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it("calls next() for ::ffff:127.0.0.1 (IPv4-mapped localhost)", () => {
      const req = makeReq({ socket: { remoteAddress: "::ffff:127.0.0.1" } });
      const res = makeRes();

      authMiddleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it("returns 403 for non-localhost address", () => {
      const req = makeReq({ socket: { remoteAddress: "192.168.1.1" } });
      const res = makeRes();

      authMiddleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ error: "forbidden" });
      expect(next).not.toHaveBeenCalled();
    });

    it("returns 403 when remoteAddress is empty", () => {
      const req = makeReq({ socket: { remoteAddress: "" } });
      const res = makeRes();

      authMiddleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ error: "forbidden" });
    });
  });
});
