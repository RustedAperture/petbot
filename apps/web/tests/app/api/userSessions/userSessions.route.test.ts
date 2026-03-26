// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";

import { GET, DELETE } from "@/app/api/userSessions/[userId]/route";

function sessionCookie(session: any) {
  return `petbot_session=${encodeURIComponent(JSON.stringify(session))}`;
}

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("/app/api/userSessions/:userId proxy", () => {
  it("GET without cookie returns 401", async () => {
    const req = new Request("http://localhost/api/userSessions/u1");
    const res = await GET(req as any, {
      params: Promise.resolve({ userId: "u1" }),
    });
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json).toEqual({ error: "unauthorized" });
  });

  it("DELETE without cookie returns 401", async () => {
    const req = new Request("http://localhost/api/userSessions/u1", {
      method: "DELETE",
    });
    const res = await DELETE(req as any, {
      params: Promise.resolve({ userId: "u1" }),
    });
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json).toEqual({ error: "unauthorized" });
  });

  it("GET forwards to internal API with userId from URL", async () => {
    const session = { user: { id: "123" } };

    const mockFetch = vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify({ guilds: [] }), { status: 200 }),
      );
    (global as any).fetch = mockFetch;

    const req = new Request("http://localhost/api/userSessions/123", {
      headers: { cookie: sessionCookie(session) },
    });
    const res: any = await GET(req as any, {
      params: Promise.resolve({ userId: "123" }),
    });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual({ guilds: [] });

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const calledUrl = String(mockFetch.mock.calls[0][0]);
    expect(calledUrl).toContain("/api/userSessions/123");
  });

  it("DELETE forwards to internal API and returns result", async () => {
    const session = { user: { id: "456" } };

    const mockFetch = vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify({ ok: true }), { status: 200 }),
      );
    (global as any).fetch = mockFetch;

    const req = new Request("http://localhost/api/userSessions/456", {
      method: "DELETE",
      headers: { cookie: sessionCookie(session) },
    });
    const res: any = await DELETE(req as any, {
      params: Promise.resolve({ userId: "456" }),
    });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual({ ok: true });

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const calledUrl = String(mockFetch.mock.calls[0][0]);
    expect(calledUrl).toContain("/api/userSessions/456");
    expect(mockFetch.mock.calls[0][1].method).toBe("DELETE");
  });

  it("GET with mismatched userId returns 403", async () => {
    const session = { user: { id: "123" } };

    const req = new Request("http://localhost/api/userSessions/999", {
      headers: { cookie: sessionCookie(session) },
    });
    const res: any = await GET(req as any, {
      params: Promise.resolve({ userId: "999" }),
    });
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json).toEqual({ error: "forbidden" });
  });
});
