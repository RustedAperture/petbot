import { describe, it, expect } from "vitest";
import { findFileUpward } from "@/lib/fs";

describe("findFileUpward utility", () => {
  it("locates a file by walking upward from cwd", async () => {
    const file = await findFileUpward("privacy.md", 5);
    expect(file).not.toBeNull();
    expect(file).toMatch(/privacy\.md$/);
  });

  it("returns null when a file cannot be found", async () => {
    const file = await findFileUpward("this-does-not-exist.txt", 2);
    expect(file).toBeNull();
  });

  it("respects the maxDepth parameter", async () => {
    const file = await findFileUpward("privacy.md", 0);
    expect(file).toBeNull();
  });
});
