import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock internal-api module
vi.mock("@/lib/internal-api", () => ({
  getInternalApiBase: vi.fn(() => "http://127.0.0.1:3001"),
  internalApiHeadersOptional: vi.fn(() => ({
    "x-internal-api-key": "test-key",
  })),
}));

import { proxyRequest } from "@/lib/proxy";

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("proxyRequest", () => {
  it("forwards JSON response from upstream", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      status: 200,
      text: () => Promise.resolve('{"ok":true}'),
      headers: new Headers({ "content-type": "application/json" }),
    });

    const res = await proxyRequest("/api/test");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ ok: true });
  });

  it("returns 503 when fetch throws", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("ECONNREFUSED"));

    const res = await proxyRequest("/api/test");
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body).toEqual({ error: "upstream_unavailable" });
  });

  it("forwards upstream status code", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      status: 404,
      text: () => Promise.resolve('{"error":"not_found"}'),
      headers: new Headers(),
    });

    const res = await proxyRequest("/api/test");
    expect(res.status).toBe(404);
  });

  it("sends correct method, body, and Content-Type header", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      status: 200,
      text: () => Promise.resolve("{}"),
      headers: new Headers(),
    });

    await proxyRequest("/api/test", { method: "POST", body: { key: "value" } });

    expect(global.fetch).toHaveBeenCalledWith(
      "http://127.0.0.1:3001/api/test",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ key: "value" }),
        headers: expect.objectContaining({
          "Content-Type": "application/json",
        }),
      }),
    );
  });

  it("forwards content-type when forwardContentType is true", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      status: 200,
      text: () => Promise.resolve("raw text"),
      headers: new Headers({ "content-type": "text/plain" }),
    });

    const res = await proxyRequest("/api/test", { forwardContentType: true });
    expect(res.headers.get("content-type")).toBe("text/plain");
    const text = await res.text();
    expect(text).toBe("raw text");
  });

  it("strips details field on 500+ when stripInternalDetails is true", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      status: 500,
      text: () =>
        Promise.resolve('{"error":"internal","details":"secret stack trace"}'),
      headers: new Headers(),
    });

    const res = await proxyRequest("/api/test", {
      stripInternalDetails: true,
    });
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body).toEqual({ error: "internal" });
    expect(body.details).toBeUndefined();
  });

  it("does not strip details on non-500 responses", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      status: 400,
      text: () =>
        Promise.resolve('{"error":"bad_request","details":"missing field"}'),
      headers: new Headers(),
    });

    const res = await proxyRequest("/api/test", {
      stripInternalDetails: true,
    });
    const body = await res.json();
    expect(body.details).toBe("missing field");
  });

  it("falls back to raw text when response is not JSON", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      status: 200,
      text: () => Promise.resolve("not json"),
      headers: new Headers(),
    });

    const res = await proxyRequest("/api/test");
    const text = await res.text();
    expect(text).toBe("not json");
  });
});
