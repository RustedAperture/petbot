import { describe, it, expect } from "vitest";
import { GET } from "../../../apps/web/app/api/changelog/route.js";
import fs from "fs";
import path from "path";

// We just verify that the route successfully reads the root changelog and returns it
// as plain text. The route is tiny so the test is mostly smoke-checking the path
// resolution logic.

describe("/app/api/changelog route", () => {
  it("returns the contents of the root changelog.md file", async () => {
    const req = new Request("http://localhost/api/changelog");
    const res: any = await GET(req as any);
    expect(res.status).toBe(200);
    const body = await res.text();

    // load the file directly from the repo root (cwd during tests is repo root)
    const expected = fs.readFileSync(
      path.join(process.cwd(), "changelog.md"),
      "utf-8",
    );
    expect(body).toBe(expected);
  });
});
