import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, POST, DELETE } from "../../../apps/web/app/api/optout/route.js";

function sessionCookie(session: any) {
  return `petbot_session=${encodeURIComponent(JSON.stringify(session))}`;
}

beforeEach(() => vi.restoreAllMocks());

describe("/api/optout proxy", () => {
  it("GET without cookie → 401", async () => {
    const res = await GET(new Request("http://localhost/api/optout") as any);
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "unauthorized" });
  });

  it("POST without cookie → 401", async () => {
    const res = await POST(
      new Request("http://localhost/api/optout", { method: "POST" }) as any,
    );
    expect(res.status).toBe(401);
  });

  it("DELETE without cookie → 401", async () => {
    const res = await DELETE(
      new Request("http://localhost/api/optout", { method: "DELETE" }) as any,
    );
    expect(res.status).toBe(401);
  });

  it("GET forwards userId and returns optedOut from internal API", async () => {
    const mockFetch = vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify({ optedOut: true }), { status: 200 }),
      );
    (global as any).fetch = mockFetch;

    const req = new Request("http://localhost/api/optout", {
      headers: { cookie: sessionCookie({ user: { id: "123" } }) },
    });
    const res = await GET(req as any);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ optedOut: true });
    expect(String(mockFetch.mock.calls[0][0])).toContain(
      "/api/optOut?userId=123",
    );
  });

  it("POST forwards userId with POST method", async () => {
    const mockFetch = vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify({ ok: true }), { status: 200 }),
      );
    (global as any).fetch = mockFetch;

    const req = new Request("http://localhost/api/optout", {
      method: "POST",
      headers: { cookie: sessionCookie({ user: { id: "456" } }) },
    });
    const res = await POST(req as any);
    expect(res.status).toBe(200);
    expect(mockFetch.mock.calls[0][1].method).toBe("POST");
    expect(String(mockFetch.mock.calls[0][0])).toContain("userId=456");
  });

  it("DELETE forwards userId with DELETE method", async () => {
    const mockFetch = vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify({ ok: true }), { status: 200 }),
      );
    (global as any).fetch = mockFetch;

    const req = new Request("http://localhost/api/optout", {
      method: "DELETE",
      headers: { cookie: sessionCookie({ user: { id: "789" } }) },
    });
    const res = await DELETE(req as any);
    expect(res.status).toBe(200);
    expect(mockFetch.mock.calls[0][1].method).toBe("DELETE");
  });
});
