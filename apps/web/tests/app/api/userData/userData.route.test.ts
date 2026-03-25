// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";

import { DELETE } from "@/app/api/userData/route";

function sessionCookie(session: any) {
  return `petbot_session=${encodeURIComponent(JSON.stringify(session))}`;
}

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("/app/api/userData proxy", () => {
  it("DELETE without cookie returns 401", async () => {
    const req = new Request("http://localhost/api/userData", {
      method: "DELETE",
    });
    const res: any = await DELETE(req as any);
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

    const req = new Request("http://localhost/api/userData", {
      method: "DELETE",
      headers: { cookie: sessionCookie(session) },
    });
    const res: any = await DELETE(req as any);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual({ ok: true });

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const calledUrl = String(mockFetch.mock.calls[0][0]);
    expect(calledUrl).toContain("/api/userData?userId=789");
    expect(mockFetch.mock.calls[0][1].method).toBe("DELETE");
  });
});
