// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";

import { GET as globalGet } from "@/app/api/events/route";
import { GET as globalStreamGet } from "@/app/api/events/stream/route";
import { GET as guildGet } from "@/app/api/events/guild/[guildId]/route";
import { GET as guildStreamGet } from "@/app/api/events/guild/[guildId]/stream/route";
import { GET as userGet } from "@/app/api/events/user/[userId]/route";
import { GET as userStreamGet } from "@/app/api/events/user/[userId]/stream/route";
import { GET as userLocationGet } from "@/app/api/events/user/[userId]/location/[locationId]/route";
import { GET as userLocationStreamGet } from "@/app/api/events/user/[userId]/location/[locationId]/stream/route";
import { createSessionCookieValue } from "@/lib/internal-api";

function sessionCookie(session: any) {
  return `petbot_session=${encodeURIComponent(createSessionCookieValue(session))}`;
}

function reqFor(url: string, session?: any) {
  return new Request(url, {
    headers: session ? { cookie: sessionCookie(session) } : {},
  });
}

const SSE_BODY = "id: 1\nevent: action\ndata: {}\n\n";
let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.restoreAllMocks();
  fetchMock = vi.fn();
  (global as any).fetch = fetchMock;
});

describe("global scope", () => {
  it("stream pipes the upstream body with SSE headers", async () => {
    fetchMock.mockResolvedValue(new Response(SSE_BODY, { status: 200 }));
    const res = await globalStreamGet(
      new Request("http://localhost/api/events/stream"),
    );
    expect(res.headers.get("content-type")).toBe("text/event-stream");
    expect(res.headers.get("cache-control")).toBe("no-cache, no-transform");
    expect(res.headers.get("x-accel-buffering")).toBe("no");
    expect(await res.text()).toContain("event: action");
    expect(String(fetchMock.mock.calls[0][0])).toMatch(/\/api\/events\/stream$/);
  });

  it("stream returns 503 when the bot is unreachable", async () => {
    fetchMock.mockRejectedValue(new Error("ECONNREFUSED"));
    const res = await globalStreamGet(
      new Request("http://localhost/api/events/stream"),
    );
    expect(res.status).toBe(503);
  });

  it("stream returns 503 when the bot answers non-OK", async () => {
    fetchMock.mockResolvedValue(new Response("nope", { status: 500 }));
    const res = await globalStreamGet(
      new Request("http://localhost/api/events/stream"),
    );
    expect(res.status).toBe(503);
  });

  it("recent proxies the bot JSON", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ events: [] }), { status: 200 }),
    );
    const res = await globalGet(new Request("http://localhost/api/events"));
    expect(await res.json()).toEqual({ events: [] });
    expect(String(fetchMock.mock.calls[0][0])).toMatch(/\/api\/events\/recent$/);
  });
});

describe.each([
  ["recent", guildGet, "/api/events/recent"],
  ["stream", guildStreamGet, "/api/events/stream"],
] as const)("guild scope (%s)", (_mode, handler, botPath) => {
  const call = (guildId: string, session?: any) =>
    handler(reqFor(`http://localhost/api/events/guild/${guildId}`, session), {
      params: Promise.resolve({ guildId }),
    });

  it.each([
    ["no session", undefined, "456", 401],
    ["non-numeric guildId", { user: { id: "1" }, guilds: [{ id: "456" }] }, "abc", 400],
    ["not a member", { user: { id: "1" }, guilds: [{ id: "999" }] }, "456", 403],
  ])("%s -> %d", async (_l, session, guildId, status) => {
    const res = await call(guildId, session);
    expect(res.status).toBe(status);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("forwards locationId for a member", async () => {
    fetchMock.mockResolvedValue(
      new Response(_mode === "stream" ? SSE_BODY : "{}", { status: 200 }),
    );
    const res = await call("456", { user: { id: "1" }, guilds: [{ id: "456" }] });
    expect(res.status).toBe(200);
    expect(String(fetchMock.mock.calls[0][0])).toContain(
      `${botPath}?locationId=456`,
    );
  });

  it("resolves guilds from the bot when the session has none", async () => {
    fetchMock
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ guilds: [{ id: "456" }] }), { status: 200 }),
      )
      .mockResolvedValueOnce(
        new Response(_mode === "stream" ? SSE_BODY : "{}", { status: 200 }),
      );
    const res = await call("456", { user: { id: "1" } });
    expect(res.status).toBe(200);
    expect(String(fetchMock.mock.calls[1][0])).toContain(
      `${botPath}?locationId=456`,
    );
  });
});

describe.each([
  ["recent", userGet, userLocationGet, "/api/events/recent"],
  ["stream", userStreamGet, userLocationStreamGet, "/api/events/stream"],
] as const)("user scopes (%s)", (mode, userHandler, locHandler, botPath) => {
  const okBody = () =>
    new Response(mode === "stream" ? SSE_BODY : "{}", { status: 200 });
  const callUser = (userId: string, session?: any) =>
    userHandler(reqFor(`http://localhost/api/events/user/${userId}`, session), {
      params: Promise.resolve({ userId }),
    });
  const callLoc = (userId: string, locationId: string, session?: any) =>
    locHandler(
      reqFor(
        `http://localhost/api/events/user/${userId}/location/${locationId}`,
        session,
      ),
      { params: Promise.resolve({ userId, locationId }) },
    );

  it.each([
    ["no session", undefined, "1", 401],
    ["another user", { user: { id: "1" } }, "2", 403],
    ["non-numeric userId", { user: { id: "1" } }, "abc", 400],
  ])("user: %s -> %d", async (_l, session, userId, status) => {
    expect((await callUser(userId, session)).status).toBe(status);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("user forwards userId", async () => {
    fetchMock.mockResolvedValue(okBody());
    const res = await callUser("1", { user: { id: "1" } });
    expect(res.status).toBe(200);
    expect(String(fetchMock.mock.calls[0][0])).toMatch(
      new RegExp(`${botPath}\\?userId=1$`),
    );
  });

  it.each([
    ["no session", undefined, "1", "3", 401],
    ["another user", { user: { id: "1" } }, "2", "3", 403],
    ["non-numeric userId", { user: { id: "1" } }, "abc", "3", 400],
    ["non-numeric locationId", { user: { id: "1" } }, "1", "x", 400],
  ])("location: %s -> %d", async (_l, session, userId, locationId, status) => {
    expect((await callLoc(userId, locationId, session)).status).toBe(status);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("location forwards both filters", async () => {
    fetchMock.mockResolvedValue(okBody());
    const res = await callLoc("1", "3", { user: { id: "1" } });
    expect(res.status).toBe(200);
    expect(String(fetchMock.mock.calls[0][0])).toContain(
      `${botPath}?userId=1&locationId=3`,
    );
  });
});
