// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";

import { GET as globalGet } from "@/app/api/stats/route";
import { GET as guildGet } from "@/app/api/stats/guild/[guildId]/route";
import { GET as userGuildGet } from "@/app/api/stats/user/[userId]/guild/[guildId]/route";
import { GET as userLocationGet } from "@/app/api/stats/user/[userId]/location/[locationId]/route";

// Helper to build a fake session cookie value
function sessionCookie(session: any) {
  return `petbot_session=${encodeURIComponent(JSON.stringify(session))}`;
}

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("/app/api/stats proxy — global stats", () => {
  it("forwards to internal API without auth", async () => {
    const globalBody = { totalActionsPerformed: 100 };
    const mockFetch = vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify(globalBody), { status: 200 }),
      );
    (global as any).fetch = mockFetch;

    const res: any = await globalGet();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual(globalBody);

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const calledUrl = String(mockFetch.mock.calls[0][0]);
    expect(calledUrl).toContain("/api/stats");
    expect(calledUrl).not.toContain("userId");
    expect(calledUrl).not.toContain("guildId");
  });
});

describe("/app/api/stats/guild/:guildId proxy", () => {
  it("returns 401 without session cookie", async () => {
    const req = new Request("http://localhost/api/stats/guild/456");

    const res: any = await guildGet(req as any, {
      params: Promise.resolve({ guildId: "456" }),
    });
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json).toEqual({ error: "unauthorized" });
  });

  it("returns 401 when session cookie is invalid", async () => {
    const req = new Request("http://localhost/api/stats/guild/456", {
      headers: { cookie: "petbot_session=invalid" },
    });

    const res: any = await guildGet(req as any, {
      params: Promise.resolve({ guildId: "456" }),
    });
    expect(res.status).toBe(401);
  });

  it("returns 400 when guildId is non-numeric", async () => {
    const session = { user: { id: "123" }, guilds: [{ id: "456" }] };

    const req = new Request("http://localhost/api/stats/guild/abc", {
      headers: { cookie: sessionCookie(session) },
    });

    const res: any = await guildGet(req as any, {
      params: Promise.resolve({ guildId: "abc" }),
    });
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json).toEqual({ error: "invalid_guildId" });
  });

  it("returns 403 when user is not a guild member", async () => {
    const session = { user: { id: "123" }, guilds: [{ id: "789" }] };

    const req = new Request("http://localhost/api/stats/guild/456", {
      headers: { cookie: sessionCookie(session) },
    });

    const res: any = await guildGet(req as any, {
      params: Promise.resolve({ guildId: "456" }),
    });
    expect(res.status).toBe(403);
  });

  it("forwards to internal API and returns data on success", async () => {
    const session = { user: { id: "123" }, guilds: [{ id: "456" }] };
    const guildBody = { totalsByAction: { pet: { totalHasPerformed: 42 } } };

    const mockFetch = vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify(guildBody), { status: 200 }),
      );
    (global as any).fetch = mockFetch;

    const req = new Request("http://localhost/api/stats/guild/456", {
      headers: { cookie: sessionCookie(session) },
    });

    const res: any = await guildGet(req as any, {
      params: Promise.resolve({ guildId: "456" }),
    });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual(guildBody);

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const calledUrl = String(mockFetch.mock.calls[0][0]);
    expect(calledUrl).toContain("/api/stats/guild/456");
  });

  it("fetches guilds from internal API when not in session", async () => {
    const session = { user: { id: "123" } };
    const guildBody = { totalsByAction: { pet: { totalHasPerformed: 42 } } };
    const userSessionsBody = { guilds: [{ id: "456" }] };

    const mockFetch = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify(userSessionsBody), { status: 200 }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify(guildBody), { status: 200 }),
      );
    (global as any).fetch = mockFetch;

    const req = new Request("http://localhost/api/stats/guild/456", {
      headers: { cookie: sessionCookie(session) },
    });

    const res: any = await guildGet(req as any, {
      params: Promise.resolve({ guildId: "456" }),
    });
    expect(res.status).toBe(200);

    // first call: resolveGuilds → userSessions, second: proxyRequest → stats/guild
    expect(mockFetch).toHaveBeenCalledTimes(2);
    const firstUrl = String(mockFetch.mock.calls[0][0]);
    const secondUrl = String(mockFetch.mock.calls[1][0]);
    expect(firstUrl).toContain("/api/userSessions/123");
    expect(secondUrl).toContain("/api/stats/guild/456");
  });

  it("returns 403 when guilds fetch returns no matching guild", async () => {
    const session = { user: { id: "123" } };

    const mockFetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ guilds: [{ id: "789" }] }), {
        status: 200,
      }),
    );
    (global as any).fetch = mockFetch;

    const req = new Request("http://localhost/api/stats/guild/456", {
      headers: { cookie: sessionCookie(session) },
    });

    const res: any = await guildGet(req as any, {
      params: Promise.resolve({ guildId: "456" }),
    });
    expect(res.status).toBe(403);
  });

  it("forwards error responses from internal API", async () => {
    const session = { user: { id: "123" }, guilds: [{ id: "456" }] };

    const mockFetch = vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify({ error: "not_found" }), { status: 404 }),
      );
    (global as any).fetch = mockFetch;

    const req = new Request("http://localhost/api/stats/guild/456", {
      headers: { cookie: sessionCookie(session) },
    });

    const res: any = await guildGet(req as any, {
      params: Promise.resolve({ guildId: "456" }),
    });
    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json).toEqual({ error: "not_found" });
  });
});

describe("/app/api/stats/user/:userId/guild/:guildId proxy", () => {
  it("legacy DM flow: validate presence then return guild-level aggregates", async () => {
    const session = { user: { id: "123" }, guilds: [{ id: "456" }] };

    const presenceBody = { totalsByAction: { pet: { totalHasPerformed: 1 } } };
    const guildBody = { totalsByAction: { pet: { totalHasPerformed: 42 } } };

    const mockFetch = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify(presenceBody), { status: 200 }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify(guildBody), { status: 200 }),
      );
    (global as any).fetch = mockFetch;

    const req = new Request("http://localhost/api/stats/user/123/guild/456", {
      headers: { cookie: sessionCookie(session) },
    });

    const res: any = await userGuildGet(req as any, {
      params: Promise.resolve({ userId: "123", guildId: "456" }),
    });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual(guildBody);

    // ensure we called internal API twice (presence check + guild forward)
    expect(mockFetch).toHaveBeenCalledTimes(2);
    const firstUrl = String(mockFetch.mock.calls[0][0]);
    const secondUrl = String(mockFetch.mock.calls[1][0]);
    expect(firstUrl).toContain("/api/stats/user/123/guild/456");
    expect(secondUrl).toContain("/api/stats/guild/456");
    expect(secondUrl).not.toContain("user/123");
  });

  it("userScoped flow: forward userId+guildId and return user-scoped data", async () => {
    const session = { user: { id: "123" }, guilds: [{ id: "456" }] };

    const userBody = {
      totalsByAction: { pet: { totalHasPerformed: 7, images: ["a", "b"] } },
    };

    const mockFetch = vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify(userBody), { status: 200 }),
      );
    (global as any).fetch = mockFetch;

    const req = new Request(
      "http://localhost/api/stats/user/123/guild/456?userScoped=true",
      {
        headers: { cookie: sessionCookie(session) },
      },
    );

    const res: any = await userGuildGet(req as any, {
      params: Promise.resolve({ userId: "123", guildId: "456" }),
    });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual(userBody);

    // single forward with user+guild path
    expect(mockFetch).toHaveBeenCalledTimes(1);
    const calledUrl = String(mockFetch.mock.calls[0][0]);
    expect(calledUrl).toContain("/api/stats/user/123/guild/456");
  });

  it("presence-missing: userId present but no rows for that location -> return 404", async () => {
    const session = { user: { id: "123" }, guilds: [{ id: "456" }] };

    const mockFetch = vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify({ error: "not_found" }), { status: 404 }),
      );
    (global as any).fetch = mockFetch;

    const req = new Request("http://localhost/api/stats/user/123/guild/456", {
      headers: { cookie: sessionCookie(session) },
    });

    const res: any = await userGuildGet(req as any, {
      params: Promise.resolve({ userId: "123", guildId: "456" }),
    });
    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json).toEqual({ error: "not_found" });

    // presence check attempted once
    expect(mockFetch).toHaveBeenCalledTimes(1);
    const firstUrl = String(mockFetch.mock.calls[0][0]);
    expect(firstUrl).toContain("/api/stats/user/123/guild/456");
  });

  it("presence-check error: non-404 errors are propagated", async () => {
    const session = { user: { id: "123" }, guilds: [{ id: "456" }] };

    const mockFetch = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ error: "internal" }), { status: 500 }),
      );
    (global as any).fetch = mockFetch;

    const req = new Request("http://localhost/api/stats/user/123/guild/456", {
      headers: { cookie: sessionCookie(session) },
    });

    const res: any = await userGuildGet(req as any, {
      params: Promise.resolve({ userId: "123", guildId: "456" }),
    });
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json).toEqual({ error: "internal" });

    // only the presence check was attempted — no forward
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("returns 401 without session cookie", async () => {
    const req = new Request("http://localhost/api/stats/user/123/guild/456");

    const res: any = await userGuildGet(req as any, {
      params: Promise.resolve({ userId: "123", guildId: "456" }),
    });
    expect(res.status).toBe(401);
  });

  it("returns 403 when userId does not match session", async () => {
    const session = { user: { id: "123" }, guilds: [{ id: "456" }] };

    const req = new Request("http://localhost/api/stats/user/999/guild/456", {
      headers: { cookie: sessionCookie(session) },
    });

    const res: any = await userGuildGet(req as any, {
      params: Promise.resolve({ userId: "999", guildId: "456" }),
    });
    expect(res.status).toBe(403);
  });
});

describe("/app/api/stats/user/:userId/location/:locationId proxy", () => {
  it("returns 401 without session cookie", async () => {
    const req = new Request("http://localhost/api/stats/user/123/location/456");

    const res: any = await userLocationGet(req as any, {
      params: Promise.resolve({ userId: "123", locationId: "456" }),
    });
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json).toEqual({ error: "unauthorized" });
  });

  it("returns 401 when session cookie is invalid", async () => {
    const req = new Request(
      "http://localhost/api/stats/user/123/location/456",
      {
        headers: { cookie: "petbot_session=invalid" },
      },
    );

    const res: any = await userLocationGet(req as any, {
      params: Promise.resolve({ userId: "123", locationId: "456" }),
    });
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json).toEqual({ error: "unauthorized" });
  });

  it("returns 403 when userId does not match session", async () => {
    const session = { user: { id: "123" } };

    const req = new Request(
      "http://localhost/api/stats/user/999/location/456",
      {
        headers: { cookie: sessionCookie(session) },
      },
    );

    const res: any = await userLocationGet(req as any, {
      params: Promise.resolve({ userId: "999", locationId: "456" }),
    });
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json).toEqual({ error: "forbidden" });
  });

  it("forwards to internal API and returns data on success", async () => {
    const session = { user: { id: "123" } };

    const locationBody = {
      totalsByAction: { pet: { totalHasPerformed: 42 } },
    };
    const mockFetch = vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify(locationBody), { status: 200 }),
      );
    (global as any).fetch = mockFetch;

    const req = new Request(
      "http://localhost/api/stats/user/123/location/456",
      {
        headers: { cookie: sessionCookie(session) },
      },
    );

    const res: any = await userLocationGet(req as any, {
      params: Promise.resolve({ userId: "123", locationId: "456" }),
    });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual(locationBody);

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const calledUrl = String(mockFetch.mock.calls[0][0]);
    expect(calledUrl).toContain("/api/stats/user/123/location/456");
  });

  it("forwards error responses from internal API", async () => {
    const session = { user: { id: "123" } };

    const mockFetch = vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify({ error: "not_found" }), { status: 404 }),
      );
    (global as any).fetch = mockFetch;

    const req = new Request(
      "http://localhost/api/stats/user/123/location/456",
      {
        headers: { cookie: sessionCookie(session) },
      },
    );

    const res: any = await userLocationGet(req as any, {
      params: Promise.resolve({ userId: "123", locationId: "456" }),
    });
    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json).toEqual({ error: "not_found" });
  });
});
