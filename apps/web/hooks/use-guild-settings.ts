import { useCallback } from "react";
import useSWR from "swr";
import type { GuildSettings } from "@/types/guild";

export type ServerSettingsResponse = {
  settings: Partial<GuildSettings>;
};

const fetcher = async (url: string): Promise<ServerSettingsResponse> => {
  const res = await fetch(url);

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to fetch server settings (${res.status}): ${text}`);
  }

  return res.json();
};

const stripEmptyFields = (values: Partial<GuildSettings>) => {
  const cleaned: Partial<GuildSettings> = {};

  if (typeof values.restricted === "boolean") {
    cleaned.restricted = values.restricted;
  }

  if (values.nickname?.trim()) {
    cleaned.nickname = values.nickname.trim();
  }

  if (values.logChannel?.trim()) {
    cleaned.logChannel = values.logChannel.trim();
  }

  if (values.sleepImage?.trim()) {
    cleaned.sleepImage = values.sleepImage.trim();
  }

  if (values.defaultImages) {
    const cleanedDefaultImages = Object.fromEntries(
      Object.entries(values.defaultImages).filter(
        ([, url]) => typeof url === "string" && url.trim() !== "",
      ),
    ) as Partial<GuildSettings["defaultImages"]>;

    if (Object.keys(cleanedDefaultImages).length > 0) {
      cleaned.defaultImages =
        cleanedDefaultImages as GuildSettings["defaultImages"];
    }
  }

  return cleaned;
};

export function useGuildSettings(options: {
  guildId?: string | null;
  userId?: string | null;
}) {
  const { guildId, userId } = options;
  const shouldFetch = Boolean(guildId && userId);
  const endpoint = shouldFetch
    ? `/api/serverSettings?guildId=${encodeURIComponent(
        guildId as string,
      )}&userId=${encodeURIComponent(userId as string)}`
    : null;

  const { data, error, isLoading, mutate } = useSWR<ServerSettingsResponse>(
    endpoint,
    fetcher,
  );

  const update = useCallback(
    async (values: Partial<GuildSettings>) => {
      if (!endpoint) {
        throw new Error("Missing guildId or userId");
      }

      const payload = stripEmptyFields(values);
      if (Object.keys(payload).length === 0) {
        return undefined;
      }

      const res = await fetch(endpoint, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(
          `Failed to update server settings (${res.status}): ${text}`,
        );
      }

      const responseJson = await res.json();

      if (responseJson?.settings) {
        // Optimistically update the cache with the server's response; skip
        // background revalidation since we already have the authoritative data.
        await mutate(
          { settings: responseJson.settings },
          { revalidate: false },
        );
        return responseJson.settings;
      }

      await mutate();
      return null;
    },
    [endpoint, mutate],
  );

  return {
    settings: data?.settings ?? null,
    isLoading,
    error: error ?? null,
    refresh: mutate,
    update,
  };
}
