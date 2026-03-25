"use client";

import * as React from "react";
import { ACTIONS } from "@petbot/constants";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardAction,
} from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
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
import { Skeleton } from "@/components/ui/skeleton";
import type { GuildSettings } from "@/types/guild";

const ACTION_DEFAULT_IMAGE_FIELDS = Object.keys(ACTIONS) as Array<
  keyof typeof ACTIONS
>;

const actionImagesSchemaShape = ACTION_DEFAULT_IMAGE_FIELDS.reduce(
  (shape, action) => ({
    ...shape,
    [action]: z.url().or(z.literal("")).optional(),
  }),
  {} as Record<keyof typeof ACTIONS, z.ZodTypeAny>,
);

const AdminGuildSettingsSchema = z.object({
  nickname: z.string().optional(),
  logChannel: z.string().optional(),
  sleepImage: z.url().or(z.literal("")).optional(),
  restricted: z.boolean(),
  defaultImages: z.object(actionImagesSchemaShape),
});

type AdminGuildSettingsFormValues = z.infer<typeof AdminGuildSettingsSchema>;

export type AdminGuildSettingsFormProps = {
  guildId: string;
  sessionUserId: string | null;
  settings: Partial<GuildSettings> | null;
  isSettingsLoading: boolean;
  isSettingsError: Error | null;
  refresh: () => Promise<unknown> | void;
  channelItems: Array<{ label: string; value: string }>;
  channelsLoading: boolean;
  channelsError: Error | null;
  pageLoading: boolean;
  guild: { id: string; name: string; icon?: string | null } | null;
  guildIconUrl: string | null;
  isLoadingAll: boolean;
  update: (values: Partial<GuildSettings>) => Promise<unknown> | unknown;
};

function titleCase(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function ImagePreview({ url, alt }: { url: string; alt: string }) {
  const [hasError, setHasError] = React.useState(false);

  React.useEffect(() => {
    setHasError(false);
  }, [url]);

  const trimmed = url.trim();
  if (!trimmed || hasError) return null;

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

export default function AdminGuildSettingsForm({
  guildId,
  sessionUserId,
  settings,
  isSettingsLoading,
  isSettingsError,
  refresh,
  channelItems,
  channelsLoading,
  channelsError,
  pageLoading,
  guild,
  guildIconUrl,
  isLoadingAll,
  update,
}: AdminGuildSettingsFormProps) {
  const form = useForm<AdminGuildSettingsFormValues>({
    resolver: zodResolver(AdminGuildSettingsSchema),
    defaultValues: {
      nickname: "",
      logChannel: "",
      sleepImage: "",
      restricted: false,
      defaultImages: ACTION_DEFAULT_IMAGE_FIELDS.reduce(
        (acc, action) => ({ ...acc, [action]: "" }),
        {} as Record<keyof typeof ACTIONS, string>,
      ),
    },
  });

  React.useEffect(() => {
    if (!settings) return;

    form.reset({
      nickname: settings.nickname ?? "",
      logChannel: settings.logChannel ?? "",
      sleepImage: settings.sleepImage ?? "",
      restricted: settings.restricted ?? false,
      defaultImages: {
        ...ACTION_DEFAULT_IMAGE_FIELDS.reduce(
          (acc, action) => ({
            ...acc,
            [action]:
              settings.defaultImages?.[
                action as keyof typeof settings.defaultImages
              ] ?? "",
          }),
          {} as Record<keyof typeof ACTIONS, string>,
        ),
      },
    });
  }, [settings, form]);

  const [saving, setSaving] = React.useState(false);
  const [saveError, setSaveError] = React.useState<Error | null>(null);

  const onSubmit = async (values: AdminGuildSettingsFormValues) => {
    setSaving(true);
    setSaveError(null);
    try {
      await update(values as Partial<GuildSettings>);
    } catch (error) {
      console.error(error);
      setSaveError(error as Error);
    } finally {
      setSaving(false);
    }
  };

  const effectiveError = isSettingsError ?? channelsError;
  const message = effectiveError?.message?.toLowerCase() ?? "";
  const isBotNotInServer = message.includes("forbidden");

  if (pageLoading) {
    return (
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
    );
  }

  return (
    <form
      className="w-full flex flex-col gap-6"
      onSubmit={form.handleSubmit(onSubmit)}
      noValidate
    >
      {guildId ? (
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
                type="submit"
                size="lg"
                disabled={isLoadingAll || saving || !form.formState.isDirty}
              >
                {saving ? "Saving…" : "Save"}
              </Button>
            </CardAction>
          </CardHeader>
        </Card>
      ) : null}

      {effectiveError ? (
        <Alert variant="destructive">
          <InfoIcon className="size-4" aria-hidden="true" />
          <AlertTitle>
            {isBotNotInServer ? "Bot not in server" : "Error loading settings"}
          </AlertTitle>
          <AlertDescription>
            {isBotNotInServer
              ? "Add PetBot to this server and run /server-setup, then refresh."
              : effectiveError.message || "Unable to load guild settings."}
          </AlertDescription>
        </Alert>
      ) : null}

      {saveError ? (
        <Alert variant="destructive">
          <InfoIcon className="size-4" aria-hidden="true" />
          <AlertTitle>Failed to save settings</AlertTitle>
          <AlertDescription>
            {saveError.message || "Unable to save guild settings."}
          </AlertDescription>
        </Alert>
      ) : null}

      {!effectiveError && (
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
                  aria-invalid={!!form.formState.errors.nickname}
                  {...form.register("nickname")}
                />
                {form.formState.errors.nickname?.message ? (
                  <FieldError>
                    {form.formState.errors.nickname.message}
                  </FieldError>
                ) : null}
              </Field>
              <Field>
                <FieldLabel htmlFor="logChannel">Log Channel</FieldLabel>
                <FieldDescription>
                  This is the channel where PetBot will post its logs and
                  notifications.
                </FieldDescription>
                <Select
                  items={channelItems}
                  value={form.watch("logChannel") ?? ""}
                  onValueChange={(val) =>
                    form.setValue("logChannel", val ?? "")
                  }
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
                  <Switch
                    id="restricted"
                    checked={form.watch("restricted")}
                    onCheckedChange={(checked) =>
                      form.setValue("restricted", checked, {
                        shouldDirty: true,
                      })
                    }
                  />
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
                      aria-invalid={!!form.formState.errors.sleepImage}
                      {...form.register("sleepImage")}
                    />
                    {form.formState.errors.sleepImage?.message ? (
                      <FieldError>
                        {form.formState.errors.sleepImage.message}
                      </FieldError>
                    ) : null}
                  </div>
                  <ImagePreview
                    url={String(form.watch("sleepImage") ?? "")}
                    alt="Sleep image preview"
                  />
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
                          aria-invalid={
                            !!form.formState.errors.defaultImages?.[action]
                          }
                          {...form.register(`defaultImages.${action}` as const)}
                        />
                        {form.formState.errors.defaultImages?.[action]
                          ?.message ? (
                          <FieldError>
                            {
                              form.formState.errors.defaultImages[action]
                                ?.message
                            }
                          </FieldError>
                        ) : null}
                      </div>
                      <ImagePreview
                        url={String(
                          (
                            form.watch("defaultImages") as Record<
                              string,
                              string
                            >
                          )[action] ?? "",
                        )}
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
