import { describe, it, expect } from "vitest";
import { findFileUpward } from "../../../apps/web/lib/fs.js";
import path from "path";

describe("findFileUpward utility", () => {
  it("locates a file in the current working directory", async () => {
    const file = await findFileUpward("privacy.md", 3);
    expect(file).toBe(path.join(process.cwd(), "privacy.md"));
  });

  it("returns null when a file cannot be found", async () => {
    const file = await findFileUpward("this-does-not-exist.txt", 2);
    expect(file).toBeNull();
  });

  it("respects the maxDepth parameter", async () => {
    // using a very small depth should fail even though the file exists
    const file = await findFileUpward("privacy.md", 0);
    expect(file).toBeNull();
  });
});
