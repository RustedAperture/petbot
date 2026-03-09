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

    // first try parenthesized date
    const parenMatch = s.version.match(/\(([^)]+)\)$/);
    if (parenMatch) {
      date = parenMatch[1].trim();
    } else {
      // split on " - " and look at the last segment for digits
      const parts = s.version.split(" - ");
      const last = parts[parts.length - 1];
      if (/\d/.test(last)) {
        date = last.trim();
      }
    }

    // derive title/id
    let title = s.version;
    if (date) {
      // date was found, strip only the date portion and any parentheses
      title = title.replace(/\s*\([^)]*\)$/, "");
      const dashIndex = title.lastIndexOf(" - ");
      if (dashIndex !== -1 && /\d/.test(title.slice(dashIndex + 3))) {
        title = title.slice(0, dashIndex);
      }
    } else {
      // no date; drop any trailing description after the first dash
      const firstDash = title.indexOf(" - ");
      if (firstDash !== -1) {
        title = title.slice(0, firstDash);
      }
      title = title.replace(/\s*\([^)]*\)$/, "");
    }
    const id = title;
    return {
      id,
      title,
      description: desc,
      date,
    };
  });
}
