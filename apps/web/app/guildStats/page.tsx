"use client";

import * as React from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useSession } from "@/hooks/use-session";
import { useGlobalStats } from "@/hooks/use-global-stats";
import { useBotGuilds } from "@/hooks/use-bot-guilds";
import StatsCard from "@/components/stats/stats-card";
import StatsCardSimple from "@/components/stats/stats-card-simple";
import { Card, CardContent } from "@/components/ui/card";
import GuildSelect from "@/components/guild-select";

export default function GuildStatsPage() {
  const params = useSearchParams();
  const router = useRouter();
  const queryGuildId = params.get("guildId");
  const { session } = useSession();

  // fetch bot-known guild ids and compute intersection with user's session guilds
  const { data: botGuildIds, isLoading: botGuildsLoading } = useBotGuilds(
    session?.user.id ?? null,
  );

  const availableGuilds = (session?.guilds ?? []).filter((g) =>
    (botGuildIds ?? []).includes(g.id),
  );

  const resolvedGuildId = queryGuildId ?? null;

  // if no guild in the URL but we have available guilds, default to the first one
  React.useEffect(() => {
    if (
      resolvedGuildId === null &&
      !botGuildsLoading &&
      availableGuilds.length > 0
    ) {
      // replace to avoid adding an extra history entry
      router.replace(`/guildStats?guildId=${availableGuilds[0].id}`);
    }
  }, [resolvedGuildId, botGuildsLoading, availableGuilds, router]);

  const handleGuildChange = React.useCallback(
    (v: string) => router.push(`/guildStats?guildId=${v}`),
    [router],
  );

  const { data, isLoading, error } = useGlobalStats({
    guildId: resolvedGuildId,
  });

  // If no guildId provided, show the selector (or sign-in prompt)
  if (!resolvedGuildId)
    return (
      <main>
        <h2 className="text-lg font-semibold">Guild Stats</h2>

        {session ? (
          <div className="mt-4">
            <GuildSelect value={resolvedGuildId} onChange={handleGuildChange} />
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
    <main>
      {/* show content when we already have data; only show page-level loader when there's no data */}
      {!data ? (
        isLoading ? (
          <p className="mt-4 text-sm text-muted-foreground">
            Loading guild stats…
          </p>
        ) : (
          <p className="mt-4 text-sm text-muted-foreground">No data</p>
        )
      ) : (
        <div
          className={`flex flex-col gap-4 ${isLoading ? "opacity-80" : ""}`}
          aria-busy={isLoading}
        >
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3">
            <Card className="mx-auto w-full">
              <CardContent className="flex items-center gap-2">
                <GuildSelect
                  value={resolvedGuildId}
                  onChange={handleGuildChange}
                  size="sm"
                />

                {isLoading && (
                  <span className="text-xs text-muted-foreground ml-2">
                    Refreshing…
                  </span>
                )}
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
