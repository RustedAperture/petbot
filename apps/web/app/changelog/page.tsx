"use client";

import React, { useEffect, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  parseChangelog,
  ChangelogSection,
  changelogToTimelineItems,
} from "@/lib/changelog";
import {
  InteractiveTimeline,
  TimelineItem,
} from "@/components/uitripled/interactive-timeline";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";

export default function ChangelogPage() {
  const [changelog, setChangelog] = useState<string | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  // null represents "all versions"; otherwise string is a specific version
  const [selectedVersion, setSelectedVersion] = useState<string | null>(null);

  const isMobile = useIsMobile();

  useEffect(() => {
    if (changelog !== null || fetchError !== null) return;
    fetch("/api/changelog")
      .then((r) => {
        if (!r.ok) {
          throw new Error(`HTTP ${r.status}`);
        }
        return r.text();
      })
      .then((text) => setChangelog(text))
      .catch(() => setFetchError("Failed to load changelog."));
  }, [changelog, fetchError]);

  const sections: ChangelogSection[] = useMemo(
    () => (changelog ? parseChangelog(changelog) : []),
    [changelog],
  );

  const timelineItems: TimelineItem[] = useMemo(
    () => changelogToTimelineItems(sections),
    [sections],
  );

  const filteredTimelineItems: TimelineItem[] = useMemo(() => {
    if (selectedVersion === null) return timelineItems;

    const idx = sections.findIndex((s) => s.version === selectedVersion);
    if (idx !== -1) {
      return [timelineItems[idx]];
    }
    return [];
  }, [selectedVersion, sections, timelineItems]);

  return (
    <main className="prose dark:prose-invert p-4">
      <h1>Changelog</h1>

      {sections.length > 0 && (
        <div className="mb-4">
          <Select
            value={selectedVersion}
            onValueChange={(value) => {
              setSelectedVersion(value ?? null);
            }}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="All versions" />
            </SelectTrigger>
            <SelectContent>
              {sections.map((s) => (
                <SelectItem key={s.version} value={s.version}>
                  {s.version}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {filteredTimelineItems.length > 0 && !isMobile && (
        <div className="mb-8">
          <InteractiveTimeline items={filteredTimelineItems} />
        </div>
      )}

      {filteredTimelineItems.length > 0 && isMobile && (
        <div className="mb-4">
          {filteredTimelineItems.map((item) => (
            <div
              key={item.id}
              className="mb-4 rounded-lg border border-border bg-card p-4 dark:bg-linear-to-br from-primary/20 to-50%"
            >
              {item.date && (
                <p className="text-xs text-muted-foreground">{item.date}</p>
              )}
              <h3 className="mt-1 text-2xl font-semibold">{item.title}</h3>
              <div className="mt-1 text-sm text-muted-foreground prose prose-sm dark:prose-invert">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {item.description}
                </ReactMarkdown>
              </div>
            </div>
          ))}
        </div>
      )}

      {fetchError && <p className="text-destructive">{fetchError}</p>}
      {!fetchError && filteredTimelineItems.length === 0 && (
        <p className="text-sm text-muted-foreground">No changelog entries.</p>
      )}
    </main>
  );
}
