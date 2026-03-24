"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import { useSession } from "@/hooks/use-session";
import { useGuildChannels } from "@/hooks/use-guild-channels";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardAction,
  CardContent,
} from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { getDiscordGuildIconUrl } from "@/lib/utils";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldTitle,
} from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { InfoIcon } from "lucide-react";

const ACTION_DEFAULT_IMAGE_FIELDS = [
  "pet",
  "bite",
  "hug",
  "bonk",
  "squish",
  "explode",
] as const;

function titleCase(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function ImagePreview({ url, alt }: { url: string; alt: string }) {
  const [hasError, setHasError] = React.useState(false);

  React.useEffect(() => {
    setHasError(false);
  }, [url]);

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

export default function AdminGuildPage() {
  const params = useParams();
  const rawGuildId = params?.guildId;
  const guildId =
    typeof rawGuildId === "string"
      ? rawGuildId
      : Array.isArray(rawGuildId)
        ? (rawGuildId[0] ?? "")
        : "";

  return (
    <AdminGuildPageContent key={guildId || "no-guild"} guildId={guildId} />
  );
}

function AdminGuildPageContent({ guildId }: { guildId: string }) {
  const { session, loading: sessionLoading } = useSession();

  const [logChannel, setLogChannel] = React.useState<string | null>("");
  const [sleepImage, setSleepImage] = React.useState("");
  const [actionImages, setActionImages] = React.useState<
    Record<(typeof ACTION_DEFAULT_IMAGE_FIELDS)[number], string>
  >({
    pet: "",
    bite: "",
    hug: "",
    bonk: "",
    squish: "",
    explode: "",
  });
  const [saving, setSaving] = React.useState(false);
  const formRef = React.useRef<HTMLFormElement | null>(null);

  const { channels, isLoading, error } = useGuildChannels(
    guildId || null,
    session?.user?.id ?? null,
  );

  const pageLoading =
    sessionLoading || !guildId || !session?.user?.id || isLoading;

  const channelItems =
    channels.length > 0
      ? channels.map((channel) => ({ label: channel.name, value: channel.id }))
      : [
          {
            label: isLoading ? "Loading channels…" : "No channels available",
            value: "",
          },
        ];

  const guild = session?.guilds?.find((g) => g.id === guildId) ?? null;
  const guildIconUrl = guild
    ? getDiscordGuildIconUrl(guild.id, guild.icon)
    : null;

  // (debug logs removed)

  return (
    <form className="w-full flex flex-col gap-6">
      {guildId ? (
        <>
          <Card>
            <CardHeader className="flex items-center gap-6">
              <Avatar size="lg">
                {guildIconUrl ? (
                  <AvatarImage
                    src={guildIconUrl}
                    alt={`${guild?.name ?? "Server"} icon`}
                  />
                ) : (
                  <AvatarFallback>
                    {(guild?.name ?? guildId).charAt(0).toUpperCase()}
                  </AvatarFallback>
                )}
              </Avatar>
              <div className="flex-1">
                <CardTitle>{guild?.name ?? guildId}</CardTitle>
                <CardDescription>{`Guild ID: ${guildId}`}</CardDescription>
              </div>
              <CardAction className="self-center">
                <Button
                  size="lg"
                  onClick={async () => {
                    if (saving) return;
                    setSaving(true);
                    try {
                      const payload = {
                        guildId,
                        sleepImage,
                        actionImages,
                        logChannel,
                      };
                      console.log("Saving guild settings", payload);
                      await new Promise((r) => setTimeout(r, 500));
                    } finally {
                      setSaving(false);
                    }
                  }}
                  disabled={pageLoading || saving}
                >
                  {saving ? "Saving…" : "Save"}
                </Button>
              </CardAction>
            </CardHeader>
          </Card>
        </>
      ) : null}

      {pageLoading ? (
        <div className="w-full p-4">
          <div className="grid gap-6 md:grid-cols-[minmax(0,0.75fr)_auto_minmax(0,1.25fr)] md:items-stretch">
            <div className="space-y-6">
              <Skeleton className="h-8 w-3/4" />
              <Skeleton className="h-12" />
              <Skeleton className="h-12" />
            </div>

            <Separator
              orientation="vertical"
              className="hidden md:block md:h-full"
            />

            <div className="space-y-6">
              <Skeleton className="h-12" />
              <Skeleton className="h-12" />
              <Skeleton className="h-12" />
            </div>
          </div>
        </div>
      ) : error ? (
        error.message === "forbidden" ? (
          <Alert variant={"destructive"}>
            <InfoIcon className="size-4" aria-hidden="true" />
            <AlertTitle>Bot not in server</AlertTitle>
            <AlertDescription>
              You need to add PetBot to this server before you can manage it.
              Please invite the bot and try again.
            </AlertDescription>
          </Alert>
        ) : (
          <Alert variant={"destructive"}>
            <InfoIcon className="size-4" aria-hidden="true" />
            <AlertTitle>Failed to load server settings</AlertTitle>
            <AlertDescription>{error.message}</AlertDescription>
          </Alert>
        )
      ) : (
        <FieldGroup>
          <div className="grid gap-6 md:grid-cols-[minmax(0,0.75fr)_auto_minmax(0,1.25fr)] md:items-stretch">
            <div className="flex flex-col gap-6">
              <Field>
                <FieldLabel htmlFor="nickname">Nickname</FieldLabel>
                <FieldDescription>
                  This is the nickname that PetBot will use in this server.
                </FieldDescription>
                <Input
                  id="nickname"
                  type="text"
                  placeholder="PetBot"
                  required
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="logChannel">Log Channel</FieldLabel>
                <FieldDescription>
                  This is the channel where PetBot will post its logs and
                  notifications.
                </FieldDescription>
                <Select
                  items={channelItems}
                  value={logChannel || ""}
                  onValueChange={(val) => setLogChannel(val)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a log channel" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectLabel>Text channels</SelectLabel>
                      {channelItems.map((item) => (
                        <SelectItem key={item.value} value={item.value}>
                          {item.label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
              <FieldLabel htmlFor="restrictedMode">
                <Field orientation="horizontal">
                  <FieldContent>
                    <FieldTitle>Restricted Mode</FieldTitle>
                    <FieldDescription>
                      When enabled users in this server will only be able to use
                      the images specified below
                    </FieldDescription>
                  </FieldContent>
                  <Switch id="restrictedMode" />
                </Field>
              </FieldLabel>
            </div>

            <Separator
              orientation="vertical"
              className="hidden md:block md:h-full"
            />

            <div className="flex flex-col gap-6">
              <Field>
                <div className="flex items-start gap-3">
                  <div className="min-w-0 flex-1 space-y-3">
                    <FieldLabel htmlFor="sleepImage">Sleep Image</FieldLabel>
                    <FieldDescription>
                      Used when /sleep command is used.
                    </FieldDescription>
                    <Input
                      id="sleepImage"
                      type="text"
                      placeholder="http://example.com/image.jpg"
                      value={sleepImage}
                      onChange={(e) => setSleepImage(e.target.value)}
                      required
                    />
                  </div>
                  <ImagePreview url={sleepImage} alt="Sleep image preview" />
                </div>
              </Field>
              {ACTION_DEFAULT_IMAGE_FIELDS.map((action) => {
                const displayName = titleCase(action);
                return (
                  <Field key={action}>
                    <div className="flex items-center gap-3">
                      <div className="min-w-0 flex-1 space-y-3">
                        <FieldLabel htmlFor={`${action}Image`}>
                          {displayName} Image
                        </FieldLabel>
                        <FieldDescription>
                          Used when /{action} command is used.
                        </FieldDescription>
                        <Input
                          id={`${action}Image`}
                          type="text"
                          placeholder="http://example.com/image.jpg"
                          value={actionImages[action]}
                          onChange={(e) =>
                            setActionImages((prev) => ({
                              ...prev,
                              [action]: e.target.value,
                            }))
                          }
                          required
                        />
                      </div>
                      <ImagePreview
                        url={actionImages[action]}
                        alt={`${displayName} image preview`}
                      />
                    </div>
                  </Field>
                );
              })}
            </div>
          </div>
        </FieldGroup>
      )}
    </form>
  );
}
