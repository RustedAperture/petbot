// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";

import { GET as guildsGet } from "@/app/api/guilds/route";
import { GET as guildsUserGet } from "@/app/api/guilds/user/[userId]/route";

// Helper to build a fake session cookie value
function sessionCookie(session: any) {
  return `petbot_session=${encodeURIComponent(JSON.stringify(session))}`;
}

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("/app/api/guilds proxy", () => {
  it("returns 401 without session cookie", async () => {
    const req = new Request("http://localhost/api/guilds");

    const res: any = await guildsGet(req as any);
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json).toEqual({ error: "unauthorized" });
  });

  it("returns 401 when session cookie is invalid", async () => {
    const req = new Request("http://localhost/api/guilds", {
      headers: { cookie: "petbot_session=invalid" },
    });

    const res: any = await guildsGet(req as any);
    expect(res.status).toBe(401);
  });

  it("forwards to internal API and returns data on success", async () => {
    const session = { user: { id: "123" }, guilds: [{ id: "456" }] };
    const guildsBody = [{ id: "456", name: "Test Guild" }];

    const mockFetch = vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify(guildsBody), { status: 200 }),
      );
    (global as any).fetch = mockFetch;

    const req = new Request("http://localhost/api/guilds", {
      headers: { cookie: sessionCookie(session) },
    });

    const res: any = await guildsGet(req as any);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual(guildsBody);

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const calledUrl = String(mockFetch.mock.calls[0][0]);
    expect(calledUrl).toContain("/api/guilds/user/123");
  });

  it("forwards error responses from internal API", async () => {
    const session = { user: { id: "123" } };

    const mockFetch = vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify({ error: "not_found" }), { status: 404 }),
      );
    (global as any).fetch = mockFetch;

    const req = new Request("http://localhost/api/guilds", {
      headers: { cookie: sessionCookie(session) },
    });

    const res: any = await guildsGet(req as any);
    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json).toEqual({ error: "not_found" });
  });
});

describe("/app/api/guilds/user/:userId proxy", () => {
  it("returns 401 without session cookie", async () => {
    const req = new Request("http://localhost/api/guilds/user/123");

    const res: any = await guildsUserGet(req as any, {
      params: Promise.resolve({ userId: "123" }),
    });
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json).toEqual({ error: "unauthorized" });
  });

  it("returns 403 when userId does not match session", async () => {
    const session = { user: { id: "123" }, guilds: [{ id: "456" }] };

    const req = new Request("http://localhost/api/guilds/user/999", {
      headers: { cookie: sessionCookie(session) },
    });

    const res: any = await guildsUserGet(req as any, {
      params: Promise.resolve({ userId: "999" }),
    });
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json).toEqual({ error: "forbidden" });
  });

  it("forwards to internal API and returns data on success", async () => {
    const session = { user: { id: "123" }, guilds: [{ id: "456" }] };
    const guildsBody = [{ id: "456", name: "Test Guild" }];

    const mockFetch = vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify(guildsBody), { status: 200 }),
      );
    (global as any).fetch = mockFetch;

    const req = new Request("http://localhost/api/guilds/user/123", {
      headers: { cookie: sessionCookie(session) },
    });

    const res: any = await guildsUserGet(req as any, {
      params: Promise.resolve({ userId: "123" }),
    });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual(guildsBody);

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const calledUrl = String(mockFetch.mock.calls[0][0]);
    expect(calledUrl).toContain("/api/guilds/user/123");
  });

  it("forwards error responses from internal API", async () => {
    const session = { user: { id: "123" } };

    const mockFetch = vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify({ error: "not_found" }), { status: 404 }),
      );
    (global as any).fetch = mockFetch;

    const req = new Request("http://localhost/api/guilds/user/123", {
      headers: { cookie: sessionCookie(session) },
    });

    const res: any = await guildsUserGet(req as any, {
      params: Promise.resolve({ userId: "123" }),
    });
    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json).toEqual({ error: "not_found" });
  });
});
