"use client";

import * as React from "react";
import { ActionImageRow } from "@/components/action-image-row";
import { EditImagesDialog } from "@/components/dialogs/edit-images-dialog";
import { ImageLightbox } from "@/components/dialogs/image-lightbox";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { ItemGroup } from "@/components/ui/item";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useBotGuilds } from "@/hooks/use-bot-guilds";
import { useCustomActions } from "@/hooks/use-custom-actions";
import { useGlobalStats } from "@/hooks/use-global-stats";
import { useSession } from "@/hooks/use-session";
import { ownImages, placeOptions } from "@/lib/action-images";

function displayName(actionName: string) {
  return actionName ? actionName[0].toUpperCase() + actionName.slice(1) : "";
}

/** Lists the actions a user can set images for in one of their servers. */
export default function ActionImagesCard({
  userId,
  className,
}: {
  userId: string;
  className?: string;
}) {
  const { session } = useSession();
  const { data: locationIds, isLoading: isPlacesLoading } =
    useBotGuilds(userId);
  const { actions: ownActions } = useCustomActions({ kind: "user", userId });
  const ownNames = React.useMemo(
    () => new Set(ownActions.map((a) => a.name)),
    [ownActions],
  );
  const places = React.useMemo(
    () => placeOptions(session?.guilds ?? [], locationIds ?? []),
    [session?.guilds, locationIds],
  );
  const [pickedId, setPickedId] = React.useState<string | null>(null);
  const placeId = places.some((p) => p.id === pickedId)
    ? pickedId
    : (places[0]?.id ?? null);

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Your images</CardTitle>
        <CardDescription>
          What people see when you use an action, or when it&apos;s used on you.
        </CardDescription>
        {places.length > 0 && (
          <CardAction>
            <Select value={placeId ?? ""} onValueChange={setPickedId}>
              <SelectTrigger size="sm" aria-label="Server">
                <SelectValue>
                  {places.find((p) => p.id === placeId)?.name}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {places.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </CardAction>
        )}
      </CardHeader>
      <CardContent>
        {placeId ? (
          <PlaceImages
            // Remounting refetches the list after you add or remove a custom action.
            key={`${placeId}:${ownActions.map((a) => `${a.name}@${a.updatedAt}`).join(",")}`}
            userId={userId}
            guildId={placeId}
            ownNames={ownNames}
          />
        ) : isPlacesLoading ? (
          <p className="text-sm text-muted-foreground">Loading servers…</p>
        ) : (
          <Empty className="border">
            <EmptyHeader>
              <EmptyTitle>No servers yet</EmptyTitle>
              <EmptyDescription>
                Use PetBot in a server first, then set your images here.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        )}
      </CardContent>
    </Card>
  );
}

function PlaceImages({
  userId,
  guildId,
  ownNames,
}: {
  userId: string;
  guildId: string;
  ownNames: Set<string>;
}) {
  const { data, isLoading, error, refresh } = useGlobalStats({
    userId,
    guildId,
    userScoped: true,
  });
  const [editing, setEditing] = React.useState<{
    actionName: string;
    images: string[];
  } | null>(null);
  const [viewing, setViewing] = React.useState<{
    actionName: string;
    images: string[];
    index: number;
  } | null>(null);
  // Kept apart from `viewing` so the images stay visible while the dialog closes.
  const [isViewOpen, setIsViewOpen] = React.useState(false);

  if (!data) {
    return (
      <p className="text-sm text-muted-foreground">
        {isLoading ? "Loading images…" : error ? "Couldn't load images." : null}
      </p>
    );
  }

  return (
    <>
      <ItemGroup>
        {Object.entries(data.totalsByAction).map(([actionName, totals]) => {
          const images = ownImages(totals, ownNames.has(actionName));
          return (
            <ActionImageRow
              key={actionName}
              actionName={actionName}
              title={
                <>
                  {displayName(actionName)}
                  {ownNames.has(actionName) && (
                    <span className="font-normal text-muted-foreground">
                      — yours
                    </span>
                  )}
                </>
              }
              images={images}
              fallbackImage={totals.imageUrl}
              emptyLabel="Default"
              onView={(shown, index) => {
                setViewing({ actionName, images: shown, index });
                setIsViewOpen(true);
              }}
              onEdit={() => setEditing({ actionName, images })}
            />
          );
        })}
      </ItemGroup>
      <EditImagesDialog
        open={editing !== null}
        onOpenChange={(next) => {
          if (!next) {
            setEditing(null);
          }
        }}
        actionName={editing?.actionName ?? ""}
        guildId={guildId}
        initialImages={editing?.images ?? []}
        onSaved={refresh}
      />
      <ImageLightbox
        key={viewing ? `${viewing.actionName}:${viewing.index}` : "none"}
        open={isViewOpen}
        onOpenChange={setIsViewOpen}
        title={`${displayName(viewing?.actionName ?? "")} images`}
        images={viewing?.images ?? []}
        startIndex={viewing?.index ?? 0}
      />
    </>
  );
}
