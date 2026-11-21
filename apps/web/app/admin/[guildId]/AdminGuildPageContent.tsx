"use client";

import { useSession } from "@/hooks/use-session";
import { useGuildChannels } from "@/hooks/use-guild-channels";
import { useGuildSettings } from "@/hooks/use-guild-settings";
import { getDiscordGuildIconUrl, isAdminOrOwnerGuild } from "@/lib/utils";
import CustomActionsManager from "@/components/custom-actions-manager";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import AdminGuildSettingsForm from "./AdminGuildSettingsForm";

export default function AdminGuildPageContent({
  guildId,
}: {
  guildId: string;
}) {
  const { session, loading: sessionLoading } = useSession();
  const guild = session?.guilds?.find((g) => g.id === guildId) ?? null;
  // Manage Server users reach the page for custom actions only; the settings
  // endpoints stay restricted to owners and Administrators.
  const isActionsOnly = guild !== null && !isAdminOrOwnerGuild(guild);
  const settingsUserId = isActionsOnly ? null : (session?.user?.id ?? null);
  const {
    settings,
    isLoading: isSettingsLoading,
    error: isSettingsError,
    update,
  } = useGuildSettings({ guildId, userId: settingsUserId });

  const {
    channels,
    isLoading: channelsLoading,
    error: channelsError,
  } = useGuildChannels(guildId || null, settingsUserId);

  const pageLoading =
    sessionLoading ||
    !guildId ||
    !session?.user?.id ||
    channelsLoading ||
    isSettingsLoading;

  const channelItems =
    channels.length > 0
      ? channels.map((channel) => ({ label: channel.name, value: channel.id }))
      : [
        {
          label: channelsLoading
            ? "Loading channels…"
            : "No channels available",
          value: "",
        },
      ];

  const guildIconUrl = guild
    ? getDiscordGuildIconUrl(guild.id, guild.icon)
    : null;
  return (
    <div className="flex w-full flex-col gap-6">
      {!isActionsOnly && (
        <AdminGuildSettingsForm
          guildId={guildId}
          settings={settings}
          isSettingsLoading={isSettingsLoading}
          isSettingsError={isSettingsError}
          update={update}
          channelItems={channelItems}
          channelsError={channelsError}
          pageLoading={pageLoading}
          guild={guild}
          guildIconUrl={guildIconUrl}
        />
      )}
      {!pageLoading && (
        <Card>
          <CardHeader>
            <CardTitle>Server actions</CardTitle>
            <CardDescription>
              Custom actions everyone in this server can use with
              /action.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CustomActionsManager scope={{ kind: "guild", guildId }} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
