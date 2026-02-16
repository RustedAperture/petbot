import { describe, it, expect, vi, beforeEach } from "vitest";

import { GET } from "../../../apps/web/app/api/stats/route.js";

// Helper to build a fake session cookie value
function sessionCookie(session: any) {
  return `petbot_session=${encodeURIComponent(JSON.stringify(session))}`;
}

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("/app/api/stats proxy — userScoped vs legacy DM behavior", () => {
  it("legacy DM flow: userId=session.user.id + guildId -> validate presence then return guild-level aggregates", async () => {
    const session = { user: { id: "123" }, guilds: [{ id: "456" }] };

    // mock two internal fetches: presence check (user-scoped response) then guild-level response
    const presenceBody = { totalsByAction: { pet: { totalHasPerformed: 1 } } };
    const guildBody = { totalsByAction: { pet: { totalHasPerformed: 42 } } };

    const mockFetch = vi
      .fn()
      // presence check -> 200
      .mockResolvedValueOnce(
        new Response(JSON.stringify(presenceBody), { status: 200 }),
      )
      // forward guild request -> 200
      .mockResolvedValueOnce(
        new Response(JSON.stringify(guildBody), { status: 200 }),
      );

    (global as any).fetch = mockFetch;

    const req = new Request(
      "http://localhost/api/stats?userId=123&guildId=456",
      {
        headers: { cookie: sessionCookie(session) },
      },
    );

    const res: any = await GET(req as any);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual(guildBody);

    // ensure we called internal API twice (presence check + guild forward)
    expect(mockFetch).toHaveBeenCalledTimes(2);
    const firstUrl = String(mockFetch.mock.calls[0][0]);
    const secondUrl = String(mockFetch.mock.calls[1][0]);
    expect(firstUrl).toContain("userId=123");
    expect(firstUrl).toContain("guildId=456");
    expect(secondUrl).toContain("guildId=456");
    expect(secondUrl).not.toContain("userId=");
  });

  it("userScoped flow: client requests userScoped=true -> forward userId+guildId and return user-scoped data", async () => {
    const session = { user: { id: "123" }, guilds: [{ id: "456" }] };

    const userBody = { totalsByAction: { pet: { totalHasPerformed: 7 } } };

    const mockFetch = vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify(userBody), { status: 200 }),
      );
    (global as any).fetch = mockFetch;

    const req = new Request(
      "http://localhost/api/stats?userId=123&guildId=456&userScoped=true",
      {
        headers: { cookie: sessionCookie(session) },
      },
    );

    const res: any = await GET(req as any);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual(userBody);

    // single forward with both userId+guildId
    expect(mockFetch).toHaveBeenCalledTimes(1);
    const calledUrl = String(mockFetch.mock.calls[0][0]);
    expect(calledUrl).toContain("userId=123");
    expect(calledUrl).toContain("guildId=456");
  });

  it("presence-missing: userId present but no rows for that location -> return 404", async () => {
    const session = { user: { id: "123" }, guilds: [{ id: "456" }] };

    const mockFetch = vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify({ error: "not_found" }), { status: 404 }),
      );
    (global as any).fetch = mockFetch;

    const req = new Request(
      "http://localhost/api/stats?userId=123&guildId=456",
      {
        headers: { cookie: sessionCookie(session) },
      },
    );

    const res: any = await GET(req as any);
    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json).toEqual({ error: "not_found" });

    // presence check attempted once
    expect(mockFetch).toHaveBeenCalledTimes(1);
    const firstUrl = String(mockFetch.mock.calls[0][0]);
    expect(firstUrl).toContain("userId=123");
    expect(firstUrl).toContain("guildId=456");
  });
});
