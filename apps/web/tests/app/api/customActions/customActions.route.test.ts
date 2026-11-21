// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createSessionCookieValue } from "@/lib/internal-api";

import {
  GET as userGET,
  PUT as userPUT,
} from "@/app/api/customActions/user/[userId]/route";
import { DELETE as userDELETE } from "@/app/api/customActions/user/[userId]/[name]/route";
import {
  GET as guildGET,
  PUT as guildPUT,
} from "@/app/api/customActions/guild/[guildId]/route";
import { DELETE as guildDELETE } from "@/app/api/customActions/guild/[guildId]/[name]/route";

function cookieFor(session: unknown) {
  return `petbot_session=${encodeURIComponent(createSessionCookieValue(session))}`;
}

function req(method: string, cookie?: string, body?: unknown) {
  return new Request("http://localhost/api/customActions", {
    method,
    headers: {
      ...(cookie ? { cookie } : {}),
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  }) as any;
}

const input = { name: "boop", phrase: "booped", image: "https://x.io/a.png" };
const me = cookieFor({ user: { id: "111" }, guilds: [{ id: "G1" }] });

let mockFetch: ReturnType<typeof vi.fn>;
beforeEach(() => {
  mockFetch = vi.fn(
    async () => new Response(JSON.stringify({ actions: [] }), { status: 200 }),
  );
  (global as any).fetch = mockFetch;
});

describe("user relay", () => {
  const ctx = (userId: string) => ({ params: Promise.resolve({ userId }) });
  const nameCtx = (userId: string, name: string) => ({
    params: Promise.resolve({ userId, name }),
  });

  it("returns 401 without a session", async () => {
    expect((await userGET(req("GET"), ctx("111") as any)).status).toBe(401);
  });

  it.each([
    ["GET", () => userGET(req("GET", me), ctx("222") as any)],
    ["PUT", () => userPUT(req("PUT", me, input), ctx("222") as any)],
    [
      "DELETE",
      () => userDELETE(req("DELETE", me), nameCtx("222", "boop") as any),
    ],
  ])("%s returns 403 for another user", async (_m, call) => {
    const res = await call();
    expect(res.status).toBe(403);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("GET relays to the bot", async () => {
    const res = await userGET(req("GET", me), ctx("111") as any);
    expect(res.status).toBe(200);
    expect(String(mockFetch.mock.calls[0][0])).toContain(
      "/api/customActions/user/111",
    );
  });

  it("PUT forwards the body and passes the bot's 400 error through", async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          error: "You've reached the limit of 5 custom actions.",
        }),
        { status: 400 },
      ),
    );
    const res = await userPUT(req("PUT", me, input), ctx("111") as any);
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({
      error: "You've reached the limit of 5 custom actions.",
    });
    expect(JSON.parse(mockFetch.mock.calls[0][1].body)).toEqual(input);
  });

  it("PUT rejects a non-object body", async () => {
    const res = await userPUT(req("PUT", me, [1]), ctx("111") as any);
    expect(res.status).toBe(400);
  });

  it("DELETE relays the encoded name", async () => {
    await userDELETE(req("DELETE", me), nameCtx("111", "boop") as any);
    expect(String(mockFetch.mock.calls[0][0])).toContain(
      "/api/customActions/user/111/boop",
    );
    expect(mockFetch.mock.calls[0][1].method).toBe("DELETE");
  });
});

describe("guild relay", () => {
  const ctx = (guildId: string) => ({ params: Promise.resolve({ guildId }) });
  const nameCtx = (guildId: string, name: string) => ({
    params: Promise.resolve({ guildId, name }),
  });

  it("returns 401 without a session", async () => {
    expect((await guildGET(req("GET"), ctx("G1") as any)).status).toBe(401);
  });

  it.each([
    ["GET", () => guildGET(req("GET", me), ctx("OTHER") as any)],
    ["PUT", () => guildPUT(req("PUT", me, input), ctx("OTHER") as any)],
    [
      "DELETE",
      () => guildDELETE(req("DELETE", me), nameCtx("OTHER", "boop") as any),
    ],
  ])(
    "%s returns 403 when the guild is not in the session",
    async (_m, call) => {
      const res = await call();
      expect(res.status).toBe(403);
      expect(mockFetch).not.toHaveBeenCalled();
    },
  );

  it("GET relays to the bot", async () => {
    await guildGET(req("GET", me), ctx("G1") as any);
    expect(String(mockFetch.mock.calls[0][0])).toContain(
      "/api/customActions/guild/G1",
    );
  });

  it("PUT forwards the session user as the acting user, ignoring the body", async () => {
    await guildPUT(
      req("PUT", me, { ...input, actingUserId: "999" }),
      ctx("G1") as any,
    );
    const [url, init] = mockFetch.mock.calls[0];
    expect(String(url)).toContain("/api/customActions/guild/G1/user/111");
    expect(init.method).toBe("PUT");
    expect(String(url)).not.toContain("999");
  });

  it("DELETE forwards the session user as the acting user", async () => {
    await guildDELETE(req("DELETE", me), nameCtx("G1", "boop") as any);
    expect(String(mockFetch.mock.calls[0][0])).toContain(
      "/api/customActions/guild/G1/user/111/boop",
    );
  });

  it("passes the bot's 403 through", async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ error: "forbidden" }), { status: 403 }),
    );
    const res = await guildPUT(req("PUT", me, input), ctx("G1") as any);
    expect(res.status).toBe(403);
  });
});
