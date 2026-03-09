// shared utilities for dealing with the changelog markdown

export interface ChangelogSection {
  version: string;
  content: string;
}

export type TimelineItem = {
  id: string;
  title: string;
  description: string;
  date?: string;
};

export function parseChangelog(text: string): ChangelogSection[] {
  const sections: ChangelogSection[] = [];
  // Split on any level-2 heading (`## `), which we treat as starting a version block
  const parts = text.split(/^(?=## )/m);
  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) {
      continue;
    }
    const match = trimmed.match(/^## (.+)/);
    if (match) {
      sections.push({ version: match[1].trim(), content: trimmed });
    }
  }
  return sections;
}

/**
 * Convert parseChangelog output into the shape expected by
 * {@link @uitripled/interactive-timeline#InteractiveTimeline}.
 *
 * - `version` becomes both id and title.
 * - we strip the leading `## ...` heading from content for the description.
 * - if the version string contains a date in parentheses or after a dash we
 *   preserve it as the item's `date` field (simple heuristic).
 */
export function changelogToTimelineItems(
  sections: ChangelogSection[],
): TimelineItem[] {
  return sections.map((s) => {
    const desc = s.content.replace(/^## [^\n]+\n/, "").trim();
    let date: string | undefined;
    // if the heading contains a parenthesized date, capture that; otherwise
    // look for a dash and take everything after it (common pattern like
    // "v8.3.0 - Mar 07, 2026").
    const dateMatch = s.version.match(/\(([^)]+)\)|-\s*(.+)$/);
    if (dateMatch) {
      date = dateMatch[1] || dateMatch[2];
      date = date?.trim();
    }
    // derive a title that excludes any trailing date information
    let title = s.version;
    const dashIdx = title.lastIndexOf(" - ");
    if (dashIdx !== -1) {
      title = title.slice(0, dashIdx);
    }
    const id = title; // version numbers are unique enough
    return {
      id,
      title,
      description: desc,
      date,
    };
  });
}
