"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { useSession } from "@/hooks/use-session";
import {
  StatsLoading,
  StatsError,
  StatsEmpty,
} from "@/components/stats/stats-request-state";
import { useGlobalStats } from "@/hooks/use-global-stats";
import { type ActionTotals } from "@/types/stats";
import StatsCard from "@/components/stats/stats-card";
import StatsCardView from "@/components/stats/stats-card-view";
import StatsCardSimple from "@/components/stats/stats-card-simple";
import { UserDistributionChart } from "@/components/stats/user-distribution-chart";

export default function UserStatsPage() {
  const params = useSearchParams();
  const queryUserId = params.get("userId");
  const queryLocationId =
    params.get("guildId") ?? params.get("locationId") ?? null;
  const { session, loading: sessionLoading } = useSession();
  const resolvedUserId = queryUserId ?? session?.user.id ?? null;

  const rawUserScopedParam = params.get("userScoped");
  const explicitUserScoped = rawUserScopedParam === "true";
  // Default to user-scoped when the resolved user is the session user and the
  // client did not explicitly provide userScoped. This makes `/userStats`
  // show the signed-in user's global stats by default.
  const defaultUserScoped =
    rawUserScopedParam === null &&
    resolvedUserId !== null &&
    resolvedUserId === session?.user.id;
  const queryUserScoped = explicitUserScoped || defaultUserScoped;

  if (sessionLoading && !session) {
    return (
      <main className="w-full">
        <StatsLoading label="Loading user stats…" />
      </main>
    );
  }

  if (!resolvedUserId) {
    return (
      <main>
        <h2 className="text-lg font-semibold">User Stats</h2>
        <p className="mt-4 text-sm text-muted-foreground">
          Sign in to view your stats.
        </p>
      </main>
    );
  }

  return (
    <UserStatsContent
      key={JSON.stringify([resolvedUserId, queryLocationId, queryUserScoped])}
      userId={resolvedUserId}
      queryLocationId={queryLocationId}
      userScoped={queryUserScoped}
    />
  );
}

function UserStatsContent({
  userId,
  queryLocationId,
  userScoped,
}: {
  userId: string;
  queryLocationId: string | null;
  userScoped: boolean;
}) {
  const { data, isLoading, error, refresh } = useGlobalStats({
    userId,
    guildId: queryLocationId,
    userScoped,
  });

  if (!data) {
    return (
      <main className="w-full">
        {isLoading ? (
          <StatsLoading label="Loading user stats…" />
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
      <div className="grid gap-4 xl:grid-cols-[minmax(0,3fr)_minmax(320px,1fr)]">
        <div className="flex min-w-0 flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <StatsCardSimple
              statString="Total Actions Performed"
              value={data.totalActionsPerformed}
            />
            {!queryLocationId && (
              <StatsCardSimple
                statString="Visited Locations"
                value={data.totalLocations}
              />
            )}
          </div>

          <StatsCardView className="xl:grid-cols-3 2xl:grid-cols-4">
            {(compact) =>
              entries.map(([actionKey, totals]) => (
                <StatsCard
                  key={actionKey}
                  actionName={actionKey}
                  actionImageUrl={totals.imageUrl}
                  performedCount={totals.totalHasPerformed}
                  receivedCount={totals.totalHasReceived}
                  userCount={totals.totalUsers}
                  totalUniqueUsers={data.totalUniqueUsers}
                  totalActionsPerformed={data.totalActionsPerformed}
                  userImages={totals.images}
                  guildId={queryLocationId}
                  hideUserCount={true}
                  compact={compact}
                />
              ))
            }
          </StatsCardView>
        </div>

        <aside
          aria-label="Interaction distribution"
          className="mx-auto w-full min-w-0 max-w-xl xl:mx-0 xl:max-w-none"
        >
          <UserDistributionChart totalsByAction={data.totalsByAction} />
        </aside>
      </div>
    </main>
  );
}
