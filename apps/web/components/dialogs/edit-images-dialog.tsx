"use client";

import * as React from "react";
import Image from "next/image";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { Checkbox } from "../ui/checkbox";
import { Label } from "../ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../ui/tooltip";
import { InfoIcon } from "lucide-react";

const SLOT_COUNT = 4;

interface EditImagesDialogProps {
  open: boolean;
  onOpenChange: (next: boolean) => void;
  actionName: string;
  guildId: string | null;
  initialImages: string[];
  onSaved?: (images: string[]) => void;
}

export function EditImagesDialog({
  open,
  onOpenChange,
  actionName,
  guildId,
  initialImages,
  onSaved,
}: EditImagesDialogProps) {
  const [images, setImages] = React.useState<string[]>(() =>
    Array.from({ length: SLOT_COUNT }, (_, i) => initialImages[i] ?? ""),
  );
  const [everywhere, setEverywhere] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [urlErrors, setUrlErrors] = React.useState<(string | null)[]>(
    Array(SLOT_COUNT).fill(null),
  );

  const validateUrl = (url: string): string | null => {
    if (!url) return null;
    if (!/^https?:\/\//i.test(url))
      return "URL must start with http:// or https://";
    if (url.length > 2048) return "URL is too long";
    return null;
  };

  // Reset state when dialog opens with fresh data
  React.useEffect(() => {
    if (open) {
      setImages(
        Array.from({ length: SLOT_COUNT }, (_, i) => initialImages[i] ?? ""),
      );
      setEverywhere(false);
      setError(null);
      setUrlErrors(Array(SLOT_COUNT).fill(null));
    }
  }, [open, initialImages]);

  const handleUrlChange = (index: number, value: string) => {
    setImages((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
    setUrlErrors((prev) => {
      const next = [...prev];
      next[index] = validateUrl(value);
      return next;
    });
  };

  const handleSave = async () => {
    const validated = images.map((url) => validateUrl(url.trim()));
    setUrlErrors(validated);
    if (validated.some(Boolean)) return;

    setIsSaving(true);
    setError(null);
    try {
      const filteredImages = images.map((url) => url.trim());
      const res = await fetch("/api/setImages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          guildId: everywhere ? null : guildId,
          actionType: actionName,
          images: filteredImages,
          everywhere,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body?.error ?? "Failed to save images. Please try again.");
        return;
      }

      onSaved?.(filteredImages);
      onOpenChange(false);
    } catch {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const displayName = actionName
    ? actionName[0].toUpperCase() + actionName.slice(1)
    : actionName;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit {displayName} Images</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          {Array.from({ length: SLOT_COUNT }, (_, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="size-16 shrink-0 rounded-lg overflow-hidden bg-muted border border-border">
                {images[i] && validateUrl(images[i]) === null ? (
                  <Image
                    src={images[i]}
                    alt={`Slot ${i + 1} preview`}
                    width={64}
                    height={64}
                    className="size-full object-cover"
                    unoptimized
                  />
                ) : (
                  <div className="size-full flex items-center justify-center text-muted-foreground text-xs">
                    {i + 1}
                  </div>
                )}
              </div>
              <div className="flex flex-col flex-1 gap-1">
                <Input
                  placeholder={`Slot ${i + 1} image URL`}
                  value={images[i]}
                  onChange={(e) => handleUrlChange(i, e.target.value)}
                  aria-invalid={!!urlErrors[i]}
                />
                {urlErrors[i] && (
                  <p className="text-xs text-destructive">{urlErrors[i]}</p>
                )}
              </div>
            </div>
          ))}
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <DialogFooter className="flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Checkbox
              id="set-everywhere"
              checked={everywhere}
              onCheckedChange={(checked) => setEverywhere(Boolean(checked))}
            />
            <Label htmlFor="set-everywhere" className="text-sm cursor-pointer">
              Set everywhere
            </Label>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger
                  aria-label="What does 'Set everywhere' do?"
                  className="cursor-help text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
                >
                  <InfoIcon className="size-3.5" aria-hidden="true" />
                </TooltipTrigger>
                <TooltipContent side="top">
                  Sets these images everywhere you have performed this action
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button type="button" onClick={handleSave} disabled={isSaving}>
              {isSaving ? "Saving…" : "Save"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
