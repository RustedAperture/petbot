// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createSessionCookieValue } from "@/lib/internal-api";

import { GET as meGET } from "@/app/api/owner/me/route";
import { GET as actionsGET } from "@/app/api/owner/customActions/route";
import { DELETE as actionDELETE } from "@/app/api/owner/customActions/[id]/route";
import { GET as bansGET } from "@/app/api/owner/bans/route";
import {
  DELETE as banDELETE,
  PUT as banPUT,
} from "@/app/api/owner/bans/[userId]/route";

function cookieFor(userId: string) {
  return `petbot_session=${encodeURIComponent(createSessionCookieValue({ user: { id: userId }, guilds: [] }))}`;
}

function req(method: string, cookie?: string, path = "") {
  return new Request(`http://localhost/api/owner${path}`, {
    method,
    headers: cookie ? { cookie } : {},
  }) as any;
}

const owner = cookieFor("111");
const stranger = cookieFor("222");
const idCtx = { params: Promise.resolve({ id: "7" }) } as any;
const userCtx = { params: Promise.resolve({ userId: "333" }) } as any;

let mockFetch: ReturnType<typeof vi.fn>;
beforeEach(() => {
  vi.stubEnv("OWNER_USER_ID", "111");
  mockFetch = vi.fn(
    async () => new Response(JSON.stringify({ ok: true }), { status: 200 }),
  );
  (global as any).fetch = mockFetch;
});
afterEach(() => {
  vi.unstubAllEnvs();
});

const calls = [
  ["GET customActions", (c?: string) => actionsGET(req("GET", c, "/customActions"))],
  ["DELETE customActions/:id", (c?: string) => actionDELETE(req("DELETE", c), idCtx)],
  ["GET bans", (c?: string) => bansGET(req("GET", c))],
  ["PUT bans/:userId", (c?: string) => banPUT(req("PUT", c), userCtx)],
  ["DELETE bans/:userId", (c?: string) => banDELETE(req("DELETE", c), userCtx)],
] as const;

describe("owner routes", () => {
  it.each(calls)("%s returns 401 without a session", async (_l, call) => {
    expect((await call(undefined)).status).toBe(401);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it.each(calls)("%s returns 403 for a non-owner", async (_l, call) => {
    expect((await call(stranger)).status).toBe(403);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("returns 403 for everyone when OWNER_USER_ID is empty", async () => {
    vi.stubEnv("OWNER_USER_ID", "");
    expect((await bansGET(req("GET", owner))).status).toBe(403);
  });

  it.each([
    ["GET customActions", () => actionsGET(req("GET", owner, "/customActions")), "GET", "/api/owner/customActions"],
    ["DELETE customActions/:id", () => actionDELETE(req("DELETE", owner), idCtx), "DELETE", "/api/owner/customActions/7"],
    ["GET bans", () => bansGET(req("GET", owner)), "GET", "/api/owner/bans"],
    ["PUT bans/:userId", () => banPUT(req("PUT", owner), userCtx), "PUT", "/api/owner/bans/333"],
    ["DELETE bans/:userId", () => banDELETE(req("DELETE", owner), userCtx), "DELETE", "/api/owner/bans/333"],
  ])("%s forwards to the bot for the owner", async (_l, call, method, path) => {
    expect((await call()).status).toBe(200);
    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toContain(path);
    expect(init.method).toBe(method);
  });

  it("forwards the filters to the bot", async () => {
    await actionsGET(
      req("GET", owner, "/customActions?name=boop&scope=guild&ownerId=5&x=1"),
    );
    const url = new URL(mockFetch.mock.calls[0][0]);
    expect(url.searchParams.get("name")).toBe("boop");
    expect(url.searchParams.get("scope")).toBe("guild");
    expect(url.searchParams.get("ownerId")).toBe("5");
    expect(url.searchParams.has("x")).toBe(false);
  });

  it("passes the bot's invalid_filter error through", async () => {
    mockFetch.mockResolvedValue(
      new Response(JSON.stringify({ error: "invalid_filter" }), { status: 400 }),
    );
    const res = await actionsGET(req("GET", owner, "/customActions?scope=x"));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("invalid_filter");
  });
});

describe("GET /api/owner/me", () => {
  it.each([
    ["the owner", owner, true],
    ["a non-owner", stranger, false],
    ["no session", undefined, false],
  ])("returns isOwner for %s", async (_l, cookie, expected) => {
    const res = await meGET(req("GET", cookie, "/me"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ isOwner: expected });
  });
});
