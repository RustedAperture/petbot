// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";

import { DELETE } from "@/app/api/userData/[userId]/route";

function sessionCookie(session: any) {
  return `petbot_session=${encodeURIComponent(JSON.stringify(session))}`;
}

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("/app/api/userData/:userId proxy", () => {
  it("DELETE without cookie returns 401", async () => {
    const req = new Request("http://localhost/api/userData/u1", {
      method: "DELETE",
    });
    const res: any = await DELETE(req as any, {
      params: Promise.resolve({ userId: "u1" }),
    });
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json).toEqual({ error: "unauthorized" });
  });

  it("DELETE forwards to internal API", async () => {
    const session = { user: { id: "789" } };

    const mockFetch = vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify({ ok: true }), { status: 200 }),
      );
    (global as any).fetch = mockFetch;

    const req = new Request("http://localhost/api/userData/789", {
      method: "DELETE",
      headers: { cookie: sessionCookie(session) },
    });
    const res: any = await DELETE(req as any, {
      params: Promise.resolve({ userId: "789" }),
    });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual({ ok: true });

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const calledUrl = String(mockFetch.mock.calls[0][0]);
    expect(calledUrl).toContain("/api/userData/789");
    expect(mockFetch.mock.calls[0][1].method).toBe("DELETE");
  });

  it("DELETE with mismatched userId returns 403", async () => {
    const session = { user: { id: "789" } };

    const req = new Request("http://localhost/api/userData/999", {
      method: "DELETE",
      headers: { cookie: sessionCookie(session) },
    });
    const res: any = await DELETE(req as any, {
      params: Promise.resolve({ userId: "999" }),
    });
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json).toEqual({ error: "forbidden" });
  });
});
