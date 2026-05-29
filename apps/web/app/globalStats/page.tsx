"use client";

import * as React from "react";
import { useGlobalStats } from "@/hooks/use-global-stats";
import StatsCard from "@/components/stats/stats-card";
import { ActionTotals } from "@/types/stats";
import StatsCardSimple from "@/components/stats/stats-card-simple";
import Leaderboard from "@/components/leaderboard";

export default function GlobalStatsPage() {
  const { data, isLoading, error, refresh } = useGlobalStats();
  const [hoveredAction, setHoveredAction] = React.useState<string | null>(null);

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
        <div className="grid gap-4 grid-cols-4">
          {/* Left: stats */}
          <div className="flex-1 min-w-0 col-span-4 xl:col-span-3">
            <div className="flex flex-col gap-4">
              <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3">
                <StatsCardSimple
                  statString="Total Actions Performed"
                  value={data.totalActionsPerformed}
                />
                <StatsCardSimple
                  statString="Total Unique Users"
                  value={data.totalUniqueUsers}
                />
                <StatsCardSimple
                  statString="Total Visited Locations"
                  value={data.totalLocations}
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
                    onMouseEnter={() => setHoveredAction(actionKey)}
                    onMouseLeave={() => setHoveredAction(null)}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Right: leaderboard (desktop) */}
          <Leaderboard
            locationId={null}
            actionType={hoveredAction}
            className="col-span-4 xl:col-span-1"
          />
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
