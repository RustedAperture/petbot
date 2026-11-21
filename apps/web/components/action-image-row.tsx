"use client";

import type { ReactNode } from "react";
import Image from "next/image";
import { PencilIcon } from "lucide-react";
import { ActionIcon } from "@/components/action-icon";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item";

const THUMB_BUTTON =
  "relative rounded-lg outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50";

/**
 * One action with its image thumbnails and an Edit button. With no images it
 * shows `fallbackImage` faded under `emptyLabel`, or just the label.
 */
export function ActionImageRow({
  actionName,
  title,
  images,
  fallbackImage,
  emptyLabel,
  onView,
  onEdit,
}: {
  actionName: string;
  title: ReactNode;
  images: string[];
  fallbackImage?: string | null;
  emptyLabel: string;
  onView: (images: string[], index: number) => void;
  onEdit: () => void;
}) {
  return (
    <Item variant="outline" size="sm">
      <ItemMedia>
        <ActionIcon actionType={actionName} />
      </ItemMedia>
      <ItemContent>
        <ItemTitle>{title}</ItemTitle>
      </ItemContent>
      <ItemActions>
        {images.length > 0 ? (
          <div className="flex gap-2">
            {images.map((url, i) => (
              <button
                key={url}
                type="button"
                aria-label={`View ${actionName} image ${i + 1}`}
                className={THUMB_BUTTON}
                onClick={() => onView(images, i)}
              >
                <Image
                  src={url}
                  alt=""
                  width={48}
                  height={48}
                  className="size-12 rounded-lg border object-cover transition-opacity hover:opacity-80"
                />
              </button>
            ))}
          </div>
        ) : fallbackImage ? (
          <button
            type="button"
            aria-label={`View ${actionName} default image`}
            className={THUMB_BUTTON}
            onClick={() => onView([fallbackImage], 0)}
          >
            <Image
              src={fallbackImage}
              alt=""
              width={48}
              height={48}
              className="size-12 rounded-lg border object-cover opacity-50 transition-opacity hover:opacity-70"
            />
            <Badge
              variant="outline"
              className="absolute -bottom-1.5 left-1/2 h-4 -translate-x-1/2 bg-background px-1.5 text-[10px]"
            >
              {emptyLabel}
            </Badge>
          </button>
        ) : (
          <Badge variant="outline">{emptyLabel}</Badge>
        )}
        <Button
          type="button"
          variant="outline"
          size="sm"
          aria-label={`Edit ${actionName} images`}
          onClick={onEdit}
        >
          <PencilIcon />
          Edit
        </Button>
      </ItemActions>
    </Item>
  );
}
