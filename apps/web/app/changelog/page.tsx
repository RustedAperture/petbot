"use client";

import React, { useEffect, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { parseChangelog, ChangelogSection } from "@/lib/changelog";
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
  // Base UI Select may pass `null` when nothing is selected, so our state
  // accepts string or null. We default to "all" for showing everything.
  const [selectedVersion, setSelectedVersion] = useState<string | null>("all");

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

  const displayedContent = useMemo(() => {
    if (!changelog) return null;
    if (selectedVersion === "all") return changelog;
    return (
      sections.find((s) => s.version === selectedVersion)?.content ?? changelog
    );
  }, [changelog, sections, selectedVersion]);

  return (
    <main className="prose dark:prose-invert p-4">
      <h1>Changelog</h1>

      {sections.length > 0 && (
        <div className="mb-4">
          <Select
            value={selectedVersion}
            onValueChange={(value) => {
              setSelectedVersion(value ?? "all");
            }}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="All versions" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All versions</SelectItem>
              {sections.map((s) => (
                <SelectItem key={s.version} value={s.version}>
                  {s.version}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="prose prose-sm dark:prose-invert">
        {fetchError ? (
          <p className="text-destructive">{fetchError}</p>
        ) : displayedContent ? (
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {displayedContent}
          </ReactMarkdown>
        ) : (
          "Loading..."
        )}
      </div>
    </main>
  );
}
