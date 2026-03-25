// @vitest-environment node
import { describe, it, expect } from "vitest";
import { GET } from "@/app/api/changelog/route";
import { findFileUpward } from "@/lib/fs";
import fs from "fs";

describe("/app/api/changelog route", () => {
  it("returns the contents of the root changelog.md file", async () => {
    const req = new Request("http://localhost/api/changelog");
    const res: any = await GET(req as any);
    expect(res.status).toBe(200);
    const body = await res.text();

    const changelogPath = await findFileUpward("changelog.md");
    expect(changelogPath).not.toBeNull();
    const expected = fs.readFileSync(changelogPath!, "utf-8");
    expect(body).toBe(expected);
  });
});
