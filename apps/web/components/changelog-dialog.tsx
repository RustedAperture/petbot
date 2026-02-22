"use client";

import { useEffect, useMemo, useState } from "react";
import { History } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SidebarMenuButton } from "@/components/ui/sidebar";

interface ChangelogDialogProps {
  version: string;
}

interface ChangelogSection {
  version: string;
  content: string;
}

function parseChangelog(text: string): ChangelogSection[] {
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

export function ChangelogDialog({ version }: ChangelogDialogProps) {
  const [open, setOpen] = useState(false);
  const [changelog, setChangelog] = useState<string | null>(null);
  const [selectedVersion, setSelectedVersion] = useState<string>("all");

  useEffect(() => {
    if (open && changelog === null) {
      fetch("/api/changelog")
        .then((r) => r.text())
        .then((text) => setChangelog(text))
        .catch(() => setChangelog("Failed to load changelog"));
    }
  }, [open, changelog]);

  const sections = useMemo(
    () => (changelog ? parseChangelog(changelog) : []),
    [changelog],
  );

  const displayedContent = useMemo(() => {
    if (!changelog) {
      return null;
    }
    if (selectedVersion === "all") {
      return changelog;
    }
    return (
      sections.find((s) => s.version === selectedVersion)?.content ?? changelog
    );
  }, [changelog, sections, selectedVersion]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <SidebarMenuButton
          className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
          tooltip={"Version: v" + version}
          aria-label={"Version: v" + version}
        >
          <span className="group-data-[collapsible=icon]:hidden">
            Version v{version}
          </span>
          <History className="ml-auto" />
        </SidebarMenuButton>
      </DialogTrigger>

      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Changelog</DialogTitle>
        </DialogHeader>

        {sections.length > 0 && (
          <Select value={selectedVersion} onValueChange={setSelectedVersion}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select version" />
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
        )}

        <div className="overflow-auto max-h-[60vh] prose prose-sm dark:prose-invert">
          {displayedContent ? (
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {displayedContent}
            </ReactMarkdown>
          ) : (
            "Loading..."
          )}
        </div>
        <DialogFooter showCloseButton />
      </DialogContent>
    </Dialog>
  );
}
