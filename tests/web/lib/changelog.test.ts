import { describe, it, expect } from "vitest";
import { parseChangelog } from "../../../apps/web/lib/changelog.js";

const sample = `
# Some intro

## v1.0.0 - Initial release
- added feature

## v1.1.0 - Bug fixes
- patched something
`;

describe("parseChangelog", () => {
  it("splits into sections", () => {
    const sections = parseChangelog(sample);
    expect(sections.length).toBe(2);
    expect(sections[0].version).toBe("v1.0.0 - Initial release");
    expect(sections[1].version).toBe("v1.1.0 - Bug fixes");
    expect(sections[0].content).toContain("added feature");
  });
});
