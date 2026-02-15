import * as React from "react";
import type { GlobalStats } from "@/types/stats";

type UseGlobalStatsOptions = {
  /** poll interval in ms; omit or 0 to disable */
  refreshIntervalMs?: number;
  /** optional initial data */
  initialData?: GlobalStats | null;
  /** optional filters */
  userId?: string | null;
  guildId?: string | null;
};

type UseGlobalStatsResult = {
  data: GlobalStats | null;
  isLoading: boolean;
  error: Error | null;
  refresh: () => void;
};

/**
 * Fetches `/api/stats` (proxied to the bot on :3001 in dev) and returns loading / error state + a refresh function.
 * - Call from client components.
 * - Optional polling via `refreshIntervalMs`.
 * - Can accept `userId` / `guildId` filters which are forwarded as query params.
 */
export function useGlobalStats({
  refreshIntervalMs,
  initialData,
  userId = null,
  guildId = null,
}: UseGlobalStatsOptions = {}): UseGlobalStatsResult {
  const [data, setData] = React.useState<GlobalStats | null>(
    initialData ?? null,
  );
  const [isLoading, setIsLoading] = React.useState<boolean>(!initialData);
  const [error, setError] = React.useState<Error | null>(null);
  const abortRef = React.useRef<AbortController | null>(null);

  const fetchStats = React.useCallback(
    async (signal?: AbortSignal) => {
      setIsLoading(true);
      setError(null);

      try {
        const qs = new URLSearchParams();
        if (userId) qs.set("userId", userId);
        if (guildId) qs.set("guildId", guildId);
        const url = "/api/stats" + (qs.toString() ? `?${qs.toString()}` : "");

        // use the frontend proxy `/api/*` which is configured to forward to :3001
        const res = await fetch(url, { signal, cache: "no-store" });
        if (!res.ok) throw new Error(`Failed to fetch stats (${res.status})`);
        const json = (await res.json()) as GlobalStats;
        setData(json);
      } catch (err: any) {
        if (err?.name === "AbortError") return;
        setError(err instanceof Error ? err : new Error(String(err)));
      } finally {
        setIsLoading(false);
      }
    },
    [userId, guildId],
  );

  const refresh = React.useCallback(() => {
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    void fetchStats(ac.signal);
  }, [fetchStats]);

  React.useEffect(() => {
    refresh();
    return () => abortRef.current?.abort();
  }, [refresh]);

  React.useEffect(() => {
    if (!refreshIntervalMs || refreshIntervalMs <= 0) return;
    const id = window.setInterval(() => refresh(), refreshIntervalMs);
    return () => clearInterval(id);
  }, [refreshIntervalMs, refresh]);

  return { data, isLoading, error, refresh };
}
