"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { useSession } from "@/hooks/use-session";
import { useGlobalStats } from "@/hooks/use-global-stats";
import StatsCard from "@/components/stats/stats-card";
import StatsCardSimple from "@/components/stats/stats-card-simple";

export default function UserStatsPage() {
  const params = useSearchParams();
  const queryUserId = params.get("userId");
  const { session } = useSession();
  const resolvedUserId = queryUserId ?? session?.user.id ?? null;

  const { data, isLoading, error } = useGlobalStats({ userId: resolvedUserId });

  if (!resolvedUserId)
    return (
      <main>
        <h2 className="text-lg font-semibold">User Stats</h2>
        <p className="mt-4 text-sm text-muted-foreground">
          Sign in to view your stats.
        </p>
      </main>
    );

  if (!data)
    return <p className="mt-4 text-sm text-muted-foreground">No data</p>;

  const entries = Object.entries(data.totalsByAction) as Array<[string, any]>;

  return (
    <main>
      {isLoading ? (
        <p className="mt-4 text-sm text-muted-foreground">
          Loading user stats…
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-2">
            <StatsCardSimple
              statString="Visited Locations"
              value={data.totalLocations}
            />
            <StatsCardSimple
              statString="Total Actions Performed"
              value={data.totalActionsPerformed}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {entries.map(([actionKey, totals]) => (
              <StatsCard
                key={actionKey}
                actionName={actionKey}
                actionImageUrl={totals.imageUrl}
                performedCount={totals.totalHasPerformed}
                userCount={totals.totalUsers}
                totalUniqueUsers={data.totalUniqueUsers}
                totalActionsPerformed={data.totalActionsPerformed}
              />
            ))}
          </div>
        </div>
      )}

      {error ? (
        <div className="mt-4 text-sm text-destructive">
          Failed to load stats: {error.message}
        </div>
      ) : null}
    </main>
  );
}
