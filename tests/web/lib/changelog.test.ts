import { describe, it, expect } from "vitest";
import {
  parseChangelog,
  changelogToTimelineItems,
} from "../../../apps/web/lib/changelog.js";

const sample = `
# Some intro

## v1.0.0 - Initial release
- added feature

## v1.1.0 - Bug fixes
- patched something

## v1.2.0 - Mar 07, 2026
- date test entry
`;

describe("parseChangelog", () => {
  it("splits into sections", () => {
    const sections = parseChangelog(sample);
    expect(sections.length).toBe(3);
    expect(sections[0].version).toBe("v1.0.0 - Initial release");
    expect(sections[1].version).toBe("v1.1.0 - Bug fixes");
    expect(sections[2].version).toBe("v1.2.0 - Mar 07, 2026");
    expect(sections[0].content).toContain("added feature");
  });
});

describe("changelogToTimelineItems", () => {
  it("maps sections to timeline items", () => {
    const sections = parseChangelog(sample);
    const items = changelogToTimelineItems(sections);
    expect(items.length).toBe(3);
    expect(items[0].id).toBe(sections[0].version);
    expect(items[0].title).toBe(sections[0].version);
    expect(items[0].description).toContain("added feature");
    // first two entries have no explicit date
    expect(items[0].date).toBeUndefined();
    expect(items[1].date).toBeUndefined();
    // third entry includes date after dash
    expect(items[2].date).toBe("Mar 07, 2026");
    // title for third entry should strip the date portion
    expect(items[2].title).toBe("v1.2.0");
    expect(items[2].id).toBe("v1.2.0");
  });
});
