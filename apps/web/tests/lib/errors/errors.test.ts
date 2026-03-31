import { describe, it, expect } from "vitest";
import { apiError } from "@/lib/errors";

describe("apiError", () => {
  it("returns a NextResponse with the given status and error body", async () => {
    const res = apiError(401, "unauthorized");
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body).toEqual({ error: "unauthorized" });
  });

  it("handles 400 errors", async () => {
    const res = apiError(400, "invalid_body");
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body).toEqual({ error: "invalid_body" });
  });

  it("handles 403 errors", async () => {
    const res = apiError(403, "forbidden");
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body).toEqual({ error: "forbidden" });
  });

  it("handles 503 errors", async () => {
    const res = apiError(503, "upstream_unavailable");
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body).toEqual({ error: "upstream_unavailable" });
  });
});
