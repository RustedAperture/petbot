// @vitest-environment node
import { describe, it, expect } from "vitest";
import { GET } from "@/app/api/privacy/route";
import { findFileUpward } from "@/lib/fs";
import fs from "fs";

describe("/app/api/privacy route", () => {
  it("returns the contents of the root privacy.md file", async () => {
    const req = new Request("http://localhost/api/privacy");
    const res: any = await GET(req as any);
    expect(res.status).toBe(200);
    const body = await res.text();

    const privacyPath = await findFileUpward("privacy.md");
    expect(privacyPath).not.toBeNull();
    const expected = fs.readFileSync(privacyPath!, "utf-8");
    expect(body).toBe(expected);
  });
});
