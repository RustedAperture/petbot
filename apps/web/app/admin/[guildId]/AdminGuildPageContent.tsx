"use client";

import { useSession } from "@/hooks/use-session";
import { useGuildChannels } from "@/hooks/use-guild-channels";
import { useGuildSettings } from "@/hooks/use-guild-settings";
import { getDiscordGuildIconUrl } from "@/lib/utils";
import AdminGuildSettingsForm from "./AdminGuildSettingsForm";

export default function AdminGuildPageContent({
  guildId,
}: {
  guildId: string;
}) {
  const { session, loading: sessionLoading } = useSession();
  const {
    settings,
    isLoading: isSettingsLoading,
    error: isSettingsError,
    update,
  } = useGuildSettings({ guildId, userId: session?.user?.id ?? undefined });

  const {
    channels,
    isLoading: channelsLoading,
    error: channelsError,
  } = useGuildChannels(guildId || null, session?.user?.id ?? null);

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

  const guild = session?.guilds?.find((g) => g.id === guildId) ?? null;
  const guildIconUrl = guild
    ? getDiscordGuildIconUrl(guild.id, guild.icon)
    : null;
  return (
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
  );
}
