"use client";

import * as React from "react";

type ChannelInfo = {
  id: string;
  name: string;
};

type UseGuildChannelsResult = {
  channels: ChannelInfo[];
  isLoading: boolean;
  error: Error | null;
};

export function useGuildChannels(
  guildId: string | null,
  userId: string | null,
): UseGuildChannelsResult {
  const [channels, setChannels] = React.useState<ChannelInfo[]>([]);
  const [isLoading, setIsLoading] = React.useState<boolean>(
    !!guildId && !!userId,
  );
  const [error, setError] = React.useState<Error | null>(null);

  React.useEffect(() => {
    if (!guildId || !userId) {
      setChannels([]);
      setIsLoading(false);
      setError(null);
      return;
    }

    const controller = new AbortController();
    const signal = controller.signal;
    let isActive = true;

    const fetchChannels = async () => {
      setChannels([]);
      setIsLoading(true);
      setError(null);

      try {
        const url = `/api/guildChannels/${encodeURIComponent(guildId)}/user/${encodeURIComponent(userId)}`;
        const res = await fetch(url, { cache: "no-store", signal });

        if (!res.ok) {
          const body = await res.json().catch(() => null);
          throw new Error(
            body?.error
              ? String(body.error)
              : `Failed to fetch channels (${res.status})`,
          );
        }

        const json = (await res.json()) as { channels?: ChannelInfo[] };
        if (!isActive || signal.aborted) {
          return;
        }
        setChannels(Array.isArray(json.channels) ? json.channels : []);
      } catch (err) {
        if ((err as { name?: string })?.name === "AbortError") {
          return;
        }
        if (!isActive || signal.aborted) {
          return;
        }
        setError(err instanceof Error ? err : new Error(String(err)));
      } finally {
        if (!isActive || signal.aborted) {
          return;
        }
        setIsLoading(false);
      }
    };

    void fetchChannels();

    return () => {
      isActive = false;
      controller.abort();
    };
  }, [guildId, userId]);

  return { channels, isLoading, error };
}
