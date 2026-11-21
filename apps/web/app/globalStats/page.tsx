"use client";

import * as React from "react";
import {
  StatsLoading,
  StatsError,
  StatsEmpty,
} from "@/components/stats/stats-request-state";
import { useGlobalStats } from "@/hooks/use-global-stats";
import StatsCard from "@/components/stats/stats-card";
import StatsCardView from "@/components/stats/stats-card-view";
import { ActionTotals } from "@/types/stats";
import StatsCardSimple from "@/components/stats/stats-card-simple";
import Leaderboard from "@/components/leaderboard";
import { DistributionChart } from "@/components/stats/distribution-chart";
import { useLiveEvents } from "@/hooks/use-live-events";
import LiveActivityFeed from "@/components/live-activity-feed";
import { flashKeyFor } from "@/lib/live-events";
import type { LiveScope } from "@/types/live";

export default function GlobalStatsPage() {
  const { data, isLoading, error, refresh, applyLiveEvent } = useGlobalStats();
  const [selectedAction, setSelectedAction] = React.useState<string | null>(
    null,
  );
  const scope = React.useMemo<LiveScope>(() => ({ kind: "global" }), []);
  const live = useLiveEvents(scope, {
    onEvent: (e) => applyLiveEvent(e, "location"),
    onReconnect: refresh,
  });

  if (!data) {
    return (
      <main className="w-full">
        {isLoading ? (
          <StatsLoading label="Loading global stats…" />
        ) : error ? (
          <StatsError onRetry={refresh} />
        ) : (
          <StatsEmpty />
        )}
      </main>
    );
  }

  const entries = Object.entries(data.totalsByAction) as Array<
    [string, ActionTotals]
  >;

  return (
    <main className="w-full space-y-4">
      {error && <StatsError onRetry={refresh} hasData />}
      {isLoading && (
        <p role="status" className="text-sm text-muted-foreground">
          Updating stats…
        </p>
      )}
      {!isLoading &&
        !error &&
        data.totalActionsPerformed === 0 &&
        entries.every(
          ([, totals]) =>
            totals.totalHasPerformed === 0 &&
            (totals.totalHasReceived ?? 0) === 0,
        ) && <StatsEmpty />}
      <div className="grid gap-4 grid-cols-4">
        {/* Left: stats */}
        <div className="flex-1 min-w-0 col-span-4 xl:col-span-3">
          <div className="flex flex-col gap-4">
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3">
              <StatsCardSimple
                statString="Total Actions Performed"
                value={data.totalActionsPerformed}
                flashKey={flashKeyFor(live.latestLiveEvent, "location")}
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

            <StatsCardView>
              {(compact) =>
                entries.map(([actionKey, totals]) => (
                  <StatsCard
                    key={actionKey}
                    actionName={actionKey}
                    actionImageUrl={totals.imageUrl}
                    performedCount={totals.totalHasPerformed}
                    userCount={totals.totalUsers}
                    totalUniqueUsers={data.totalUniqueUsers}
                    totalActionsPerformed={data.totalActionsPerformed}
                    compact={compact}
                  />
                ))
              }
            </StatsCardView>
          </div>
        </div>

        <div className="col-span-4 xl:col-span-1 flex flex-col gap-4">
          <LiveActivityFeed
            events={live.events}
            status={live.status}
            isLoading={live.isLoading}
          />
          <DistributionChart
            totalsByAction={data.totalsByAction}
            title="Global Action Distribution"
            description="All actions performed globally across Discord"
            metricLabel="Total Actions"
          />
          <Leaderboard
            locationId={null}
            actionType={selectedAction}
            onActionTypeChange={setSelectedAction}
            className="w-full"
          />
        </div>
      </div>
    </main>
  );
}
