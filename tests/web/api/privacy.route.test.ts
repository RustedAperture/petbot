import { describe, it, expect } from "vitest";
import { GET } from "../../../apps/web/app/api/privacy/route.js";
import fs from "fs";
import path from "path";

// Simple smoke test: ensure our new route returns the contents of the
// root privacy.md file.  (tests run with cwd=repo root)

describe("/app/api/privacy route", () => {
  it("returns the contents of the root privacy.md file", async () => {
    const req = new Request("http://localhost/api/privacy");
    const res: any = await GET(req as any);
    expect(res.status).toBe(200);
    const body = await res.text();

    const expected = fs.readFileSync(
      path.join(process.cwd(), "privacy.md"),
      "utf-8",
    );
    expect(body).toBe(expected);
  });
});
