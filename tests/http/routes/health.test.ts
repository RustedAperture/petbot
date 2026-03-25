import { describe, it, expect } from "vitest";
import healthHandler from "../../../src/http/routes/health.js";

function makeRes() {
  const res: any = {};
  res.json = vi.fn((body: unknown) => {
    res._body = body;
    return res;
  });
  return res;
}

import { vi } from "vitest";

describe("/api/health route", () => {
  it("returns ok: true", () => {
    const req = {} as any;
    const res = makeRes();

    healthHandler(req, res);

    expect(res._body.ok).toBe(true);
  });

  it("includes version from package.json", () => {
    const req = {} as any;
    const res = makeRes();

    healthHandler(req, res);

    expect(typeof res._body.version).toBe("string");
    expect(res._body.version).not.toBe("unknown");
  });

  it("includes uptime as a non-negative integer", () => {
    const req = {} as any;
    const res = makeRes();

    healthHandler(req, res);

    expect(typeof res._body.uptime).toBe("number");
    expect(res._body.uptime).toBeGreaterThanOrEqual(0);
    expect(Number.isInteger(res._body.uptime)).toBe(true);
  });

  it("includes a valid ISO timestamp", () => {
    const req = {} as any;
    const res = makeRes();

    healthHandler(req, res);

    expect(typeof res._body.timestamp).toBe("string");
    const parsed = new Date(res._body.timestamp);
    expect(parsed.toISOString()).toBe(res._body.timestamp);
  });
});
