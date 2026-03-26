"use client";

import * as React from "react";

export function useBotGuilds(userId?: string | null) {
  const [data, setData] = React.useState<string[] | null>(null);
  // don't show a loading state if there's no userId — avoid an unnecessary API call
  const [isLoading, setIsLoading] = React.useState<boolean>(Boolean(userId));
  const [error, setError] = React.useState<Error | null>(null);

  const refresh = React.useCallback(async () => {
    // no-op when userId is not provided (caller should pass a userId to trigger fetch)
    if (!userId) {
      setIsLoading(false);
      setError(null);
      setData(null);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const url = userId
        ? `/api/guilds/user/${encodeURIComponent(userId)}`
        : "/api/guilds";
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) {
        throw new Error(`Failed to fetch bot guilds (${res.status})`);
      }
      const json = await res.json();
      setData(Array.isArray(json.guildIds) ? json.guildIds : []);
    } catch (err) {
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
