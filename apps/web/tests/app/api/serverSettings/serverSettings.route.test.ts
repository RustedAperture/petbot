// @vitest-environment node
import { describe, it, expect, beforeEach } from "vitest";

function sessionCookie(session: any) {
  return `petbot_session=${encodeURIComponent(JSON.stringify(session))}`;
}

function makeGetRequest(guildId: string, userId: string, cookie?: string) {
  const url = `http://localhost/api/serverSettings/${encodeURIComponent(guildId)}/userId/${encodeURIComponent(userId)}`;
  return new Request(url, { method: "GET", headers: cookie ? { cookie } : {} });
}

function makePatchRequest(
  guildId: string,
  userId: string,
  body: any,
  cookie?: string,
) {
  const url = `http://localhost/api/serverSettings/${encodeURIComponent(guildId)}/userId/${encodeURIComponent(userId)}`;
  return new Request(url, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...(cookie ? { cookie } : {}),
    },
    body: JSON.stringify(body),
  });
}

describe("/api/serverSettings/:guildId/userId/:userId – auth and membership guards", () => {
  let GET: typeof import("@/app/api/serverSettings/[guildId]/userId/[userId]/route").GET;
  let PATCH: typeof import("@/app/api/serverSettings/[guildId]/userId/[userId]/route").PATCH;

  beforeEach(async () => {
    const mod =
      await import("@/app/api/serverSettings/[guildId]/userId/[userId]/route");
    GET = mod.GET;
    PATCH = mod.PATCH;
  });

  it("GET returns 403 when userId does not match session user", async () => {
    const cookie = sessionCookie({
      user: { id: "111" },
      guilds: [{ id: "G1" }],
    });
    const req = makeGetRequest("G1", "222", cookie);

    const res = await GET(
      req as any,
      { params: { guildId: "G1", userId: "222" } } as any,
    );
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: "forbidden" });
  });

  it("GET returns 403 when user is not a member of the guild", async () => {
    const cookie = sessionCookie({
      user: { id: "111" },
      guilds: [{ id: "OTHER" }],
    });
    const req = makeGetRequest("G1", "111", cookie);

    const res = await GET(
      req as any,
      { params: { guildId: "G1", userId: "111" } } as any,
    );
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: "forbidden" });
  });

  it("GET returns 403 when user is a member but not admin/owner", async () => {
    const cookie = sessionCookie({
      user: { id: "111" },
      guilds: [{ id: "G1", owner: false, permissions: "0" }],
    });
    const req = makeGetRequest("G1", "111", cookie);

    const res = await GET(
      req as any,
      { params: { guildId: "G1", userId: "111" } } as any,
    );
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: "forbidden" });
  });

  it("PATCH returns 403 when userId does not match session user", async () => {
    const cookie = sessionCookie({
      user: { id: "111" },
      guilds: [{ id: "G1" }],
    });
    const req = makePatchRequest("G1", "222", { foo: "bar" }, cookie);

    const res = await PATCH(
      req as any,
      { params: { guildId: "G1", userId: "222" } } as any,
    );
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: "forbidden" });
  });

  it("PATCH returns 403 when user is not a member of the guild", async () => {
    const cookie = sessionCookie({
      user: { id: "111" },
      guilds: [{ id: "OTHER" }],
    });
    const req = makePatchRequest("G1", "111", { foo: "bar" }, cookie);

    const res = await PATCH(
      req as any,
      { params: { guildId: "G1", userId: "111" } } as any,
    );
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: "forbidden" });
  });

  it("PATCH returns 403 when user is a member but not admin/owner", async () => {
    const cookie = sessionCookie({
      user: { id: "111" },
      guilds: [{ id: "G1", owner: false, permissions: "0" }],
    });
    const req = makePatchRequest("G1", "111", { foo: "bar" }, cookie);

    const res = await PATCH(
      req as any,
      { params: { guildId: "G1", userId: "111" } } as any,
    );
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: "forbidden" });
  });

  it("GET returns 401 when no session cookie is present", async () => {
    const req = makeGetRequest("G1", "111");
    const res = await GET(
      req as any,
      { params: { guildId: "G1", userId: "111" } } as any,
    );
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "unauthorized" });
  });

  it("PATCH returns 401 when no session cookie is present", async () => {
    const req = makePatchRequest("G1", "111", { foo: "bar" });
    const res = await PATCH(
      req as any,
      { params: { guildId: "G1", userId: "111" } } as any,
    );
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "unauthorized" });
  });

  it("PATCH returns 400 when body is not an object (null)", async () => {
    const cookie = sessionCookie({
      user: { id: "111" },
      guilds: [{ id: "G1", owner: true, permissions: "8" }],
    });
    const req = makePatchRequest("G1", "111", null, cookie);

    const res = await PATCH(
      req as any,
      { params: { guildId: "G1", userId: "111" } } as any,
    );
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({
      error: "invalid_payload",
      reason: "body_must_be_object",
    });
  });

  it("GET returns 400 when guildId is missing", async () => {
    const cookie = sessionCookie({ user: { id: "111" } });
    const req = makeGetRequest("", "111", cookie);
    const res = await GET(
      req as any,
      { params: { guildId: "", userId: "111" } } as any,
    );
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({
      error: "missing parameter: guildId or userId",
    });
  });

  it("PATCH returns 400 when guildId is missing", async () => {
    const cookie = sessionCookie({ user: { id: "111" } });
    const req = makePatchRequest("", "111", { foo: "bar" }, cookie);
    const res = await PATCH(
      req as any,
      { params: { guildId: "", userId: "111" } } as any,
    );
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({
      error: "missing parameter: guildId or userId",
    });
  });
});
