import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET as getByQuery } from "../../../apps/web/app/api/guildChannels/route.js";
import { GET as getByPath } from "../../../apps/web/app/api/guildChannels/[guildId]/user/[userId]/route.js";

function sessionCookie(session: any) {
  return `petbot_session=${encodeURIComponent(JSON.stringify(session))}`;
}

beforeEach(() => {
  vi.restoreAllMocks();
  delete (process.env as any).INTERNAL_API_SECRET;
});

describe("/api/guildChannels proxy", () => {
  it("GET without cookie returns 401", async () => {
    const req = new Request(
      "http://localhost/api/guildChannels?guildId=G1&userId=U1",
      {
        method: "GET",
      },
    );

    const res = await getByQuery(req as any);
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "unauthorized" });
  });

  it("GET by query forwards to internal API", async () => {
    const cookie = sessionCookie({ user: { id: "123" } });
    const req = new Request(
      "http://localhost/api/guildChannels?guildId=G1&userId=123",
      {
        method: "GET",
        headers: { cookie },
      },
    );

    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify({ channels: [] }), { status: 200 }),
      );
    (global as any).fetch = fetchMock;

    const res = await getByQuery(req as any);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ channels: [] });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0][0])).toContain(
      "/api/guildChannels?guildId=G1&userId=123",
    );
  });

  it("GET by path forwards to internal API", async () => {
    const cookie = sessionCookie({ user: { id: "123" } });
    const req = new Request("http://localhost/api/guildChannels/G1/user/123", {
      method: "GET",
      headers: { cookie },
    });

    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({ channels: [{ id: "c1", name: "general" }] }),
        {
          status: 200,
        },
      ),
    );
    (global as any).fetch = fetchMock;

    const res = await getByPath(
      req as any,
      { params: { guildId: "G1", userId: "123" } } as any,
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      channels: [{ id: "c1", name: "general" }],
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0][0])).toContain(
      "/api/guildChannels?guildId=G1&userId=123",
    );
  });

  it("GET by path supports context.params as Promise", async () => {
    const cookie = sessionCookie({ user: { id: "123" } });
    const req = new Request("http://localhost/api/guildChannels/G1/user/123", {
      method: "GET",
      headers: { cookie },
    });

    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify({ channels: [] }), { status: 200 }),
      );
    (global as any).fetch = fetchMock;

    const res = await getByPath(
      req as any,
      { params: Promise.resolve({ guildId: "G1", userId: "123" }) } as any,
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ channels: [] });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0][0])).toContain(
      "/api/guildChannels?guildId=G1&userId=123",
    );
  });

  it("GET by path strips details from 500 proxied responses in production", async () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";

    try {
      const cookie = sessionCookie({ user: { id: "123" } });
      const req = new Request(
        "http://localhost/api/guildChannels/G1/user/123",
        {
          method: "GET",
          headers: { cookie },
        },
      );

      const fetchMock = vi
        .fn()
        .mockResolvedValue(
          new Response(
            JSON.stringify({ error: "server_error", details: "secret-info" }),
            { status: 500 },
          ),
        );
      (global as any).fetch = fetchMock;

      const res = await getByPath(
        req as any,
        { params: { guildId: "G1", userId: "123" } } as any,
      );
      expect(res.status).toBe(500);
      expect(await res.json()).toEqual({ error: "server_error" });
      expect(fetchMock).toHaveBeenCalledTimes(1);
    } finally {
      process.env.NODE_ENV = originalEnv;
    }
  });
});
