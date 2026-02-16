"use client";

import * as React from "react";
import { useGlobalStats } from "@/hooks/use-global-stats";
import StatsCard from "@/components/stats/stats-card";
import { ActionTotals } from "@/types/stats";
import StatsCardSimple from "@/components/stats/stats-card-simple";

export default function GlobalStatsPage() {
  const { data, isLoading, error, refresh } = useGlobalStats();

  if (!data) {
    return <p className="mt-4 text-sm text-muted-foreground">No data</p>;
  }

  const entries = Object.entries(data.totalsByAction) as Array<
    [string, ActionTotals]
  >;

  return (
    <main>
      {isLoading ? (
        <p className="mt-4 text-sm text-muted-foreground">
          Loading global stats…
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3">
            <StatsCardSimple
              statString="Total Unique Users"
              value={data.totalUniqueUsers}
            />
            <StatsCardSimple
              statString="Total Visited Locations"
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
          Failed to load stats: {error.message} —{" "}
          <button onClick={refresh} className="underline">
            Retry
          </button>
        </div>
      ) : null}
    </main>
  );
}
