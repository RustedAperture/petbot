// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";

import { GET, DELETE } from "@/app/api/userSessions/route";

function sessionCookie(session: any) {
  return `petbot_session=${encodeURIComponent(JSON.stringify(session))}`;
}

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("/app/api/userSessions proxy", () => {
  it("GET without cookie returns 401", async () => {
    const req = new Request("http://localhost/api/userSessions");
    const res = await GET(req as any);
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json).toEqual({ error: "unauthorized" });
  });

  it("DELETE without cookie returns 401", async () => {
    const req = new Request("http://localhost/api/userSessions", {
      method: "DELETE",
    });
    const res = await DELETE(req as any);
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json).toEqual({ error: "unauthorized" });
  });

  it("GET forwards to internal API with userId from session", async () => {
    const session = { user: { id: "123" } };

    const mockFetch = vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify({ guilds: [] }), { status: 200 }),
      );
    (global as any).fetch = mockFetch;

    const req = new Request("http://localhost/api/userSessions", {
      headers: { cookie: sessionCookie(session) },
    });
    const res: any = await GET(req as any);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual({ guilds: [] });

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const calledUrl = String(mockFetch.mock.calls[0][0]);
    expect(calledUrl).toContain("/api/userSessions?userId=123");
  });

  it("DELETE forwards to internal API and returns result", async () => {
    const session = { user: { id: "456" } };

    const mockFetch = vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify({ ok: true }), { status: 200 }),
      );
    (global as any).fetch = mockFetch;

    const req = new Request("http://localhost/api/userSessions", {
      method: "DELETE",
      headers: { cookie: sessionCookie(session) },
    });
    const res: any = await DELETE(req as any);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual({ ok: true });

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const calledUrl = String(mockFetch.mock.calls[0][0]);
    expect(calledUrl).toContain("/api/userSessions?userId=456");
    expect(mockFetch.mock.calls[0][1].method).toBe("DELETE");
  });
});
