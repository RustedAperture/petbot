import { describe, it, expect, beforeEach } from "vitest";

import("../../../apps/web/app/api/serverSettings/route.js").then((_mod) => {
  // no-op to ensure module is loadable in the test runner
});

function sessionCookie(session: any) {
  return `petbot_session=${encodeURIComponent(JSON.stringify(session))}`;
}

function makeGetRequest(guildId: string, userId: string, cookie?: string) {
  const url = `http://localhost/api/serverSettings?guildId=${encodeURIComponent(
    guildId,
  )}&userId=${encodeURIComponent(userId)}`;
  return new Request(url, { method: "GET", headers: cookie ? { cookie } : {} });
}

function makePatchRequest(
  guildId: string,
  userId: string,
  body: any,
  cookie?: string,
) {
  const url = `http://localhost/api/serverSettings?guildId=${encodeURIComponent(
    guildId,
  )}&userId=${encodeURIComponent(userId)}`;
  return new Request(url, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...(cookie ? { cookie } : {}),
    },
    body: JSON.stringify(body),
  });
}

describe("/api/serverSettings – auth and membership guards", () => {
  let GET: typeof import("../../../apps/web/app/api/serverSettings/route.js").GET;
  let PATCH: typeof import("../../../apps/web/app/api/serverSettings/route.js").PATCH;

  beforeEach(async () => {
    const mod =
      await import("../../../apps/web/app/api/serverSettings/route.js");
    GET = mod.GET;
    PATCH = mod.PATCH;
  });

  it("GET returns 403 when userId does not match session user", async () => {
    const cookie = sessionCookie({
      user: { id: "111" },
      guilds: [{ id: "G1" }],
    });
    const req = makeGetRequest("G1", "222", cookie);

    const res = await GET(req as any);
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: "forbidden" });
  });

  it("GET returns 403 when user is not a member of the guild", async () => {
    const cookie = sessionCookie({
      user: { id: "111" },
      guilds: [{ id: "OTHER" }],
    });
    const req = makeGetRequest("G1", "111", cookie);

    const res = await GET(req as any);
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: "forbidden" });
  });

  it("PATCH returns 403 when userId does not match session user", async () => {
    const cookie = sessionCookie({
      user: { id: "111" },
      guilds: [{ id: "G1" }],
    });
    const req = makePatchRequest("G1", "222", { foo: "bar" }, cookie);

    const res = await PATCH(req as any);
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: "forbidden" });
  });

  it("PATCH returns 403 when user is not a member of the guild", async () => {
    const cookie = sessionCookie({
      user: { id: "111" },
      guilds: [{ id: "OTHER" }],
    });
    const req = makePatchRequest("G1", "111", { foo: "bar" }, cookie);

    const res = await PATCH(req as any);
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: "forbidden" });
  });
});
