"use client";

import * as React from "react";

export function useBotGuilds(userId?: string | null) {
  const [data, setData] = React.useState<string[] | null>(null);
  const [isLoading, setIsLoading] = React.useState<boolean>(true);
  const [error, setError] = React.useState<Error | null>(null);

  const refresh = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const qs = userId ? `?userId=${encodeURIComponent(userId)}` : "";
      const res = await fetch(`/api/guilds${qs}`, { cache: "no-store" });
      if (!res.ok)
        throw new Error(`Failed to fetch bot guilds (${res.status})`);
      const json = await res.json();
      setData(Array.isArray(json.guildIds) ? json.guildIds : []);
    } catch (err: any) {
      setError(err instanceof Error ? err : new Error(String(err)));
      setData([]);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  return { data, isLoading, error, refresh } as const;
}
