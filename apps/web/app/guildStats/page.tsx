"use client";

import * as React from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useSession } from "@/hooks/use-session";
import { useGlobalStats } from "@/hooks/use-global-stats";
import StatsCard from "@/components/stats/stats-card";
import StatsCardSimple from "@/components/stats/stats-card-simple";
import { Card, CardContent } from "@/components/ui/card";
import GuildSelect from "@/components/guild-select";

export default function GuildStatsPage() {
  const params = useSearchParams();
  const router = useRouter();
  const queryGuildId = params.get("guildId");
  const { session } = useSession();

  const resolvedGuildId = queryGuildId ?? null;

  const { data, isLoading, error } = useGlobalStats({
    guildId: resolvedGuildId,
  });

  // If no guildId provided, show the selector (or sign-in prompt)
  if (!resolvedGuildId)
    return (
      <main className="p-6">
        <h2 className="text-lg font-semibold">Guild Stats</h2>

        {session ? (
          <div className="mt-4">
            <GuildSelect
              value={resolvedGuildId}
              onChange={(v) => router.push(`/guildStats?guildId=${v}`)}
            />
          </div>
        ) : (
          <p className="mt-4 text-sm text-muted-foreground">
            Sign in to view stats for a guilds.
          </p>
        )}
      </main>
    );

  if (!data)
    return <p className="mt-4 text-sm text-muted-foreground">No data</p>;

  const entries = Object.entries(data.totalsByAction) as Array<[string, any]>;

  return (
    <main className="p-6">
      {isLoading ? (
        <p className="mt-4 text-sm text-muted-foreground">
          Loading guild stats…
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3">
            <Card className="mx-auto w-full">
              <CardContent>
                <GuildSelect
                  value={resolvedGuildId}
                  onChange={(v) => router.push(`/guildStats?guildId=${v}`)}
                  size="sm"
                />
              </CardContent>
            </Card>
            <StatsCardSimple
              statString="Total Actions Performed"
              value={data.totalActionsPerformed}
            />
            <StatsCardSimple
              statString="Total Unique Users"
              value={data.totalUniqueUsers}
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
