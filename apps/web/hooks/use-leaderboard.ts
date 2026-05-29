import useSWR from "swr";
import type { LeaderboardEntry } from "@/types/leaderboard";

interface LeaderboardData {
  locationId: string | null;
  actionType: string | null;
  entries: LeaderboardEntry[];
}

interface UseLeaderboardOptions {
  locationId?: string | null;
  actionType?: string | null;
  limit?: number;
  scope?: "guild";
}

export function useLeaderboard({
  locationId,
  actionType = null,
  limit = 10,
  scope,
}: UseLeaderboardOptions) {
  const params = new URLSearchParams();
  params.set("limit", String(limit));
  if (locationId) {
    params.set("locationId", locationId);
  }
  if (actionType) {
    params.set("actionType", actionType);
  }
  if (scope) {
    params.set("scope", scope);
  }

  const key = `/api/leaderboard?${params.toString()}`;

  const { data, error, isLoading, mutate } = useSWR<LeaderboardData>(
    key,
    async (url: string) => {
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) {
        throw new Error(`Failed to fetch leaderboard (${res.status})`);
      }
      return res.json();
    },
    {
      dedupingInterval: 2000,
    },
  );

  return {
    data: data ?? null,
    isLoading,
    error: error ?? null,
    refresh: () => mutate(),
  };
}
