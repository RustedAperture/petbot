// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the package alias used by the route so tests running under Node
// (without Vite path resolution) don't fail to resolve the module.
vi.mock("@petbot/constants", () => ({
  ACTIONS: {
    pet: true,
    bite: true,
    hug: true,
    bonk: true,
    squish: true,
    explode: true,
  },
}));

let POST: typeof import("@/app/api/setImages/route").POST;

function sessionCookie(session: any) {
  return `petbot_session=${encodeURIComponent(JSON.stringify(session))}`;
}

function validBody(overrides: Record<string, unknown> = {}) {
  return JSON.stringify({
    guildId: "123456789",
    actionType: "pet",
    images: ["https://example.com/img.png", ""],
    ...overrides,
  });
}

function makeRequest(
  opts: {
    cookie?: string;
    body?: string | null;
  } = {},
) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (opts.cookie !== undefined) {
    headers["cookie"] = opts.cookie;
  }
  return new Request("http://localhost/api/setImages", {
    method: "POST",
    headers,
    body: opts.body ?? validBody(),
  });
}

beforeEach(() => {
  vi.restoreAllMocks();
  delete (process.env as any).INTERNAL_API_SECRET;
});

beforeAll(async () => {
  // Import the route after mocking dependencies above
  const mod = await import("@/app/api/setImages/route");
  POST = mod.POST;
});

describe("/api/setImages proxy – auth", () => {
  it("POST without cookie → 401", async () => {
    const res = await POST(makeRequest() as any);
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "unauthorized" });
  });

  it("POST with invalid JSON in session cookie → 401", async () => {
    const res = await POST(
      makeRequest({ cookie: "petbot_session=not-valid-json" }) as any,
    );
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "unauthorized" });
  });

  it("POST with non-numeric userId in session → 401", async () => {
    const res = await POST(
      makeRequest({
        cookie: sessionCookie({ user: { id: "not-a-number" } }),
      }) as any,
    );
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "unauthorized" });
  });

  it("POST with missing userId in session → 401", async () => {
    const res = await POST(
      makeRequest({ cookie: sessionCookie({ user: {} }) }) as any,
    );
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "unauthorized" });
  });
});

describe("/api/setImages proxy – validation", () => {
  const cookie = sessionCookie({ user: { id: "111" } });

  it("POST with malformed JSON body → 400 invalid_json", async () => {
    const req = new Request("http://localhost/api/setImages", {
      method: "POST",
      headers: { "Content-Type": "application/json", cookie },
      body: "{ not json",
    });
    const res = await POST(req as any);
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "invalid_json" });
  });

  it("POST with missing actionType → 400 invalid_actionType", async () => {
    const res = await POST(
      makeRequest({
        cookie,
        body: validBody({ actionType: undefined }),
      }) as any,
    );
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "invalid_actionType" });
  });

  it("POST with unrecognised actionType → 400 invalid_actionType", async () => {
    const res = await POST(
      makeRequest({ cookie, body: validBody({ actionType: "slap" }) }) as any,
    );
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "invalid_actionType" });
  });

  it("POST with images that is not an array → 400 invalid_images", async () => {
    const res = await POST(
      makeRequest({
        cookie,
        body: validBody({ images: "https://example.com" }),
      }) as any,
    );
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "invalid_images" });
  });

  it("POST with more than 4 images → 400 invalid_images", async () => {
    const res = await POST(
      makeRequest({
        cookie,
        body: validBody({
          images: [
            "https://a.com",
            "https://b.com",
            "https://c.com",
            "https://d.com",
            "https://e.com",
          ],
        }),
      }) as any,
    );
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "invalid_images" });
  });

  it("POST with a non-http(s) URL in images → 400 invalid_images", async () => {
    const res = await POST(
      makeRequest({
        cookie,
        body: validBody({ images: ["ftp://evil.com/img.png"] }),
      }) as any,
    );
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "invalid_images" });
  });

  it("POST with a non-string entry in images → 400 invalid_images", async () => {
    const res = await POST(
      makeRequest({ cookie, body: validBody({ images: [42] }) }) as any,
    );
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "invalid_images" });
  });

  it("POST without guildId and everywhere=false → 400 invalid_guildId", async () => {
    const res = await POST(
      makeRequest({
        cookie,
        body: validBody({ guildId: undefined }),
      }) as any,
    );
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "invalid_guildId" });
  });

  it("POST with non-numeric guildId → 400 invalid_guildId", async () => {
    const res = await POST(
      makeRequest({ cookie, body: validBody({ guildId: "abc" }) }) as any,
    );
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "invalid_guildId" });
  });
});

describe("/api/setImages proxy – forwarding", () => {
  const cookie = sessionCookie({ user: { id: "222" } });

  it("POST forwards correct payload to internal API", async () => {
    const mockFetch = vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify({ ok: true }), { status: 200 }),
      );
    (global as any).fetch = mockFetch;

    const res = await POST(
      makeRequest({
        cookie,
        body: validBody({
          guildId: "987654321",
          actionType: "bonk",
          images: ["https://example.com/bonk.gif"],
        }),
      }) as any,
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [calledUrl, calledInit] = mockFetch.mock.calls[0];
    expect(String(calledUrl)).toContain("/api/setImages");
    expect(calledInit.method).toBe("POST");
    const sentBody = JSON.parse(calledInit.body);
    expect(sentBody).toMatchObject({
      userId: "222",
      guildId: "987654321",
      actionType: "bonk",
      images: ["https://example.com/bonk.gif"],
      everywhere: false,
    });
  });

  it("POST with everywhere=true skips guildId validation and forwards everywhere:true", async () => {
    const mockFetch = vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify({ ok: true }), { status: 200 }),
      );
    (global as any).fetch = mockFetch;

    const body = JSON.stringify({
      actionType: "hug",
      images: ["https://example.com/hug.png"],
      everywhere: true,
      // guildId intentionally omitted
    });

    const res = await POST(makeRequest({ cookie, body }) as any);

    expect(res.status).toBe(200);
    const sentBody = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(sentBody.everywhere).toBe(true);
    expect(sentBody.guildId).toBeUndefined();
  });

  it("POST attaches x-internal-api-key header when INTERNAL_API_SECRET is set", async () => {
    process.env.INTERNAL_API_SECRET = "super-secret";

    const mockFetch = vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify({ ok: true }), { status: 200 }),
      );
    (global as any).fetch = mockFetch;

    await POST(makeRequest({ cookie }) as any);

    const calledHeaders = mockFetch.mock.calls[0][1].headers;
    expect(calledHeaders["x-internal-api-key"]).toBe("super-secret");
  });

  it("POST proxies a non-JSON text response from internal API", async () => {
    const mockFetch = vi
      .fn()
      .mockResolvedValue(
        new Response("Internal Server Error", { status: 500 }),
      );
    (global as any).fetch = mockFetch;

    const res = await POST(makeRequest({ cookie }) as any);

    expect(res.status).toBe(500);
    expect(await res.text()).toBe("Internal Server Error");
  });

  it("POST empty-string images are allowed (treated as removal placeholders)", async () => {
    const mockFetch = vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify({ ok: true }), { status: 200 }),
      );
    (global as any).fetch = mockFetch;

    const res = await POST(
      makeRequest({
        cookie,
        body: validBody({ images: ["", "", "", ""] }),
      }) as any,
    );

    expect(res.status).toBe(200);
  });
});
