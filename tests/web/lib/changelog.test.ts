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

## v1.3.0 (2026-03-09)
- parenthesized date example
- **bold text** in description

## v1.4.0 - initial release - jan 1, 2024
- multiple dashes example
`;

describe("parseChangelog", () => {
  it("splits into sections", () => {
    const sections = parseChangelog(sample);
    expect(sections.length).toBe(5);
    expect(sections[0].version).toBe("v1.0.0 - Initial release");
    expect(sections[1].version).toBe("v1.1.0 - Bug fixes");
    expect(sections[2].version).toBe("v1.2.0 - Mar 07, 2026");
    expect(sections[3].version).toBe("v1.3.0 (2026-03-09)");
    expect(sections[4].version).toBe("v1.4.0 - initial release - jan 1, 2024");
    expect(sections[0].content).toContain("added feature");
  });
});

describe("changelogToTimelineItems", () => {
  it("maps sections to timeline items", () => {
    const sections = parseChangelog(sample);
    const items = changelogToTimelineItems(sections);
    expect(items.length).toBe(5);
    // ids/titles are stripped of trailing dates or descriptions
    expect(items[0].id).toBe("v1.0.0");
    expect(items[0].title).toBe("v1.0.0");
    expect(items[0].description).toContain("added feature");
    expect(items[0].date).toBeUndefined();

    expect(items[1].id).toBe("v1.1.0");
    expect(items[1].title).toBe("v1.1.0");
    expect(items[1].date).toBeUndefined();

    expect(items[2].id).toBe("v1.2.0");
    expect(items[2].title).toBe("v1.2.0");
    expect(items[2].date).toBe("Mar 07, 2026");

    // fourth entry uses parenthesized date; markdown should be preserved
    expect(items[3].id).toBe("v1.3.0");
    expect(items[3].title).toBe("v1.3.0");
    expect(items[3].date).toBe("2026-03-09");
    expect(items[3].description).toContain("parenthesized date example");
    expect(items[3].description).toContain("**bold text**");

    // fifth entry has two dashes; title keeps first segment, date picks last dash portion
    expect(items[4].id).toBe("v1.4.0 - initial release");
    expect(items[4].title).toBe("v1.4.0 - initial release");
    expect(items[4].date).toBe("jan 1, 2024");
    expect(items[4].description).toContain("multiple dashes example");
  });
});
