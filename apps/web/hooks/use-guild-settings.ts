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

const stripEmptyFields = (
  values: Partial<GuildSettings>,
): Record<string, unknown> => {
  const cleaned: Record<string, unknown> = {};

  if (typeof values.restricted === "boolean") {
    cleaned.restricted = values.restricted;
  }

  // Preserve explicit clears: if the caller provided the field (even as
  // an empty string), include it in the payload so the server can clear the
  // stored value. Trim strings when present. Accept `null` explicitly.
  if (Object.prototype.hasOwnProperty.call(values, "nickname")) {
    if (typeof values.nickname === "string") {
      cleaned.nickname = values.nickname.trim();
    } else if (values.nickname === null) {
      cleaned.nickname = null;
    }
  }

  if (Object.prototype.hasOwnProperty.call(values, "logChannel")) {
    if (typeof values.logChannel === "string") {
      cleaned.logChannel = values.logChannel.trim();
    } else if (values.logChannel === null) {
      cleaned.logChannel = null;
    }
  }

  if (Object.prototype.hasOwnProperty.call(values, "sleepImage")) {
    if (typeof values.sleepImage === "string") {
      cleaned.sleepImage = values.sleepImage.trim();
    } else if (values.sleepImage === null) {
      cleaned.sleepImage = null;
    }
  }

  if (values.defaultImages) {
    // Include any keys the form provided. If a value is an empty string
    // that means the user cleared it and we should send that explicitly.
    const cleanedDefaultImages: Record<string, string> = {};
    for (const [k, v] of Object.entries(values.defaultImages)) {
      if (typeof v === "string") {
        cleanedDefaultImages[k] = v.trim();
      }
    }

    // Always include the mapping if the form provided it (even if all
    // entries are empty strings) so the server can clear defaults.
    cleaned.defaultImages = cleanedDefaultImages;
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
    ? `/api/serverSettings/${encodeURIComponent(guildId!)}/userId/${encodeURIComponent(userId!)}`
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

      let payload = stripEmptyFields(values);

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
