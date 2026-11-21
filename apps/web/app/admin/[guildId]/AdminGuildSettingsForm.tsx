"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardAction,
  CardContent,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
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
import { InfoIcon } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import type { GuildSettings } from "@/types/guild";

const AdminGuildSettingsSchema = z.object({
  nickname: z.string().optional(),
  logChannel: z.string().optional(),
  restricted: z.boolean().optional(),
});

type AdminGuildSettingsFormValues = z.infer<typeof AdminGuildSettingsSchema>;

export type AdminGuildSettingsFormProps = {
  guildId: string;
  settings: Partial<GuildSettings> | null;
  isSettingsLoading: boolean;
  isSettingsError: Error | null;
  channelItems: Array<{ label: string; value: string }>;
  channelsError: Error | null;
  pageLoading: boolean;
  guild: { id: string; name: string; icon?: string | null } | null;
  guildIconUrl: string | null;
  update: (values: Partial<GuildSettings>) => Promise<unknown> | unknown;
};

export default function AdminGuildSettingsForm({
  guildId,
  settings,
  isSettingsError,
  channelItems,
  channelsError,
  pageLoading,
  guild,
  guildIconUrl,
  update,
}: AdminGuildSettingsFormProps) {
  const form = useForm<AdminGuildSettingsFormValues>({
    resolver: zodResolver(AdminGuildSettingsSchema),
    defaultValues: {
      nickname: "",
      logChannel: "",
      restricted: false,
    },
  });

  React.useEffect(() => {
    if (!settings) {
      return;
    }

    // Default images save on their own and refresh `settings`; keep any unsaved edits here.
    form.reset(
      {
        nickname: settings.nickname ?? "",
        logChannel: settings.logChannel ?? "",
        restricted: settings.restricted ?? false,
      },
      { keepDirtyValues: true },
    );
  }, [settings, form]);

  const [saving, setSaving] = React.useState(false);
  const [saveError, setSaveError] = React.useState<Error | null>(null);

  const onSubmit = async (values: AdminGuildSettingsFormValues) => {
    setSaving(true);
    setSaveError(null);
    try {
      await update(values as unknown as Partial<GuildSettings>);
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
      <div className="w-full p-4 xl:col-span-2">
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
      className="flex w-full flex-col gap-6 xl:col-span-2"
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
                disabled={pageLoading || saving || !form.formState.isDirty}
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
        <>
          <Card>
            <CardHeader>
              <CardTitle>Server settings</CardTitle>
              <CardDescription>
                How PetBot behaves in this server.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FieldGroup>
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
                      form.setValue("logChannel", val ?? "", {
                        shouldDirty: true,
                      })
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
                        When enabled users in this server will only be able to
                        use the images specified below
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
              </FieldGroup>
            </CardContent>
          </Card>
        </>
      )}
    </form>
  );
}
