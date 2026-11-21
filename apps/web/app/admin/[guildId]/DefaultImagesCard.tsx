"use client";

import * as React from "react";
import { ACTIONS } from "@petbot/constants";
import { z } from "zod";
import { ActionImageRow } from "@/components/action-image-row";
import { ImageLightbox } from "@/components/dialogs/image-lightbox";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { ItemGroup } from "@/components/ui/item";
import type { GuildSettings } from "@/types/guild";

const ACTION_NAMES = Object.keys(ACTIONS) as Array<keyof typeof ACTIONS>;
const ROWS = ["sleep", ...ACTION_NAMES] as const;
type RowName = (typeof ROWS)[number];

const urlSchema = z.url().or(z.literal(""));

/** The image the bot uses when the server hasn't set one; sleep has none. */
function botDefaultImage(row: RowName): string | null {
  return row === "sleep" ? null : ACTIONS[row].defaultImage;
}

function titleCase(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function ImagePreview({ url, alt }: { url: string; alt: string }) {
  const [hasError, setHasError] = React.useState(false);

  // Any URL change clears the error so the new value gets a load attempt.
  const [prevUrl, setPrevUrl] = React.useState(url);
  if (url !== prevUrl) {
    setPrevUrl(url);
    setHasError(false);
  }

  const trimmed = url.trim();
  if (!trimmed || hasError) {
    return null;
  }

  return (
    <div className="mx-auto w-24 shrink-0 aspect-square overflow-hidden rounded-md border bg-muted/20">
      <img
        src={trimmed}
        alt={alt}
        className="h-full w-full object-contain"
        loading="lazy"
        onError={() => setHasError(true)}
      />
    </div>
  );
}

/** The server's default image per action, each edited and saved on its own. */
export default function DefaultImagesCard({
  settings,
  update,
  className,
}: {
  settings: Partial<GuildSettings> | null;
  update: (values: Partial<GuildSettings>) => Promise<unknown> | unknown;
  className?: string;
}) {
  const [editing, setEditing] = React.useState<RowName | null>(null);
  const [viewing, setViewing] = React.useState<{
    row: RowName;
    image: string;
  } | null>(null);
  // Kept apart from `viewing` so the image stays visible while the dialog closes.
  const [isViewOpen, setIsViewOpen] = React.useState(false);

  const imageFor = (row: RowName): string =>
    (row === "sleep"
      ? settings?.sleepImage
      : settings?.defaultImages?.[
          row as keyof GuildSettings["defaultImages"]
      ]) ?? "";

  async function save(row: RowName, url: string) {
    if (row === "sleep") {
      await update({ sleepImage: url });
      return;
    }
    // ACTION_NAMES are exactly DefaultImages' keys, so the full map fits the type.
    const defaultImages = Object.fromEntries(
      ACTION_NAMES.map((name) => [name, name === row ? url : imageFor(name)]),
    ) as unknown as GuildSettings["defaultImages"];
    await update({ defaultImages });
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Default images</CardTitle>
        <CardDescription>
          Used for each action when someone hasn&apos;t set their own image.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ItemGroup>
          {ROWS.map((row) => {
            const image = imageFor(row);
            return (
              <ActionImageRow
                key={row}
                actionName={row}
                title={titleCase(row)}
                images={image ? [image] : []}
                fallbackImage={botDefaultImage(row)}
                emptyLabel={botDefaultImage(row) ? "Default" : "Not set"}
                onView={(shown) => {
                  setViewing({ row, image: shown[0] });
                  setIsViewOpen(true);
                }}
                onEdit={() => setEditing(row)}
              />
            );
          })}
        </ItemGroup>
      </CardContent>
      <EditDefaultImageDialog
        key={`edit:${editing ?? ""}`}
        row={editing}
        initialUrl={editing ? imageFor(editing) : ""}
        onClose={() => setEditing(null)}
        onSave={save}
      />
      <ImageLightbox
        key={`view:${viewing?.row ?? ""}`}
        open={isViewOpen}
        onOpenChange={setIsViewOpen}
        title={`${titleCase(viewing?.row ?? "")} default image`}
        images={viewing ? [viewing.image] : []}
        startIndex={0}
      />
    </Card>
  );
}

function EditDefaultImageDialog({
  row,
  initialUrl,
  onClose,
  onSave,
}: {
  row: RowName | null;
  initialUrl: string;
  onClose: () => void;
  onSave: (row: RowName, url: string) => Promise<void>;
}) {
  const [url, setUrl] = React.useState(initialUrl);
  const [error, setError] = React.useState<string | null>(null);
  const [isSaving, setIsSaving] = React.useState(false);
  const name = titleCase(row ?? "");

  async function handleSave() {
    if (!row) {
      return;
    }
    const trimmed = url.trim();
    if (!urlSchema.safeParse(trimmed).success) {
      setError("Enter a valid image URL, or leave it empty to clear it.");
      return;
    }
    setIsSaving(true);
    setError(null);
    try {
      await onSave(row, trimmed);
      onClose();
    } catch {
      setError("Failed to save the image. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Dialog
      open={row !== null}
      onOpenChange={(isOpen) => {
        if (!isOpen) {
          onClose();
        }
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit {name} Default Image</DialogTitle>
        </DialogHeader>
        <Field>
          <FieldLabel htmlFor="default-image-url">Image URL</FieldLabel>
          <div className="flex items-start gap-3">
            <Input
              id="default-image-url"
              type="text"
              placeholder="http://example.com/image.jpg"
              aria-invalid={error !== null}
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
            <ImagePreview url={url} alt={`${name} image preview`} />
          </div>
          {error && <FieldError>{error}</FieldError>}
        </Field>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            disabled={isSaving}
            onClick={() => void handleSave()}
          >
            {isSaving ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
