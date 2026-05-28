import useSWR from "swr";
import type { LeaderboardEntry } from "@/types/leaderboard";

interface LeaderboardData {
  locationId: string;
  actionType: string | null;
  entries: LeaderboardEntry[];
}

interface UseLeaderboardOptions {
  locationId: string | null;
  actionType?: string | null;
  limit?: number;
}

export function useLeaderboard({
  locationId,
  actionType = null,
  limit = 10,
}: UseLeaderboardOptions) {
  const params = new URLSearchParams();
  if (locationId) {
    params.set("locationId", locationId);
    params.set("limit", String(limit));
    if (actionType) {
      params.set("actionType", actionType);
    }
  }

  const key = locationId ? `/api/leaderboard?${params.toString()}` : null;

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
    isLoading: key ? isLoading : false,
    error: error ?? null,
    refresh: () => mutate(),
  };
}
