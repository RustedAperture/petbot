"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/hooks/use-session";
import { useGlobalStats } from "@/hooks/use-global-stats";
import { type ActionTotals } from "@/types/stats";
import { useBotGuilds } from "@/hooks/use-bot-guilds";
import StatsCard from "@/components/stats/stats-card";
import StatsCardSimple from "@/components/stats/stats-card-simple";

export default function GuildStatsPage({
  params,
}: {
  params: Promise<{ guildId: string }>;
}) {
  const { guildId } = React.use(params);
  const router = useRouter();
  const { session } = useSession();

  // fetch bot-known guild ids and compute intersection with user's session guilds
  const { data: botGuildIds, isLoading: botGuildsLoading } = useBotGuilds(
    session?.user.id ?? null,
  );

  const availableGuilds = (session?.guilds ?? []).filter((g) =>
    (botGuildIds ?? []).includes(g.id),
  );

  // if guildId not in available guilds but we have some, default to the first one
  React.useEffect(() => {
    if (
      !botGuildsLoading &&
      availableGuilds.length > 0 &&
      !availableGuilds.some((g) => g.id === guildId)
    ) {
      router.replace(`/guildStats/${availableGuilds[0].id}`);
    }
  }, [guildId, botGuildsLoading, availableGuilds, router]);

  const _handleGuildChange = React.useCallback(
    (v: string) => router.push(`/guildStats/${v}`),
    [router],
  );

  const { data, isLoading, error } = useGlobalStats({
    guildId,
  });

  // Handle loading and no-data states via JSX ternary (not early return)
  // so users see "Loading..." instead of "No data" on initial load
  if (!data) {
    return isLoading ? (
      <p className="mt-4 text-sm text-muted-foreground">Loading guild stats…</p>
    ) : (
      <p className="mt-4 text-sm text-muted-foreground">No data</p>
    );
  }

  const entries = Object.entries(data.totalsByAction) as Array<
    [string, ActionTotals]
  >;

  return (
    <main>
      <div
        className={`flex flex-col gap-4 ${isLoading ? "opacity-80" : ""}`}
        aria-busy={isLoading}
      >
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-2">
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

      {error ? (
        <div className="mt-4 text-sm text-destructive">
          Failed to load stats: {error.message}
        </div>
      ) : null}
    </main>
  );
}
