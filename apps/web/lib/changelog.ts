// shared utilities for dealing with the changelog markdown

export interface ChangelogSection {
  version: string;
  content: string;
}

export function parseChangelog(text: string): ChangelogSection[] {
  const sections: ChangelogSection[] = [];
  // Split on level-2 headings that start a version block (## vX.Y.Z ...)
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
