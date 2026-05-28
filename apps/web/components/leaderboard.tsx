"use client";

import { useSession } from "@/hooks/use-session";
import { useLeaderboard } from "@/hooks/use-leaderboard";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface LeaderboardProps {
  locationId: string | null;
  actionType: string | null;
  limit?: number;
  className?: string;
}

export default function Leaderboard({
  locationId,
  actionType,
  limit = 10,
  className,
}: LeaderboardProps) {
  const { session } = useSession();
  const { data, isLoading, error } = useLeaderboard({
    locationId,
    actionType,
    limit,
  });

  if (isLoading) {
    return (
      <div className={cn("rounded-lg border p-4", className)}>
        <h3 className="font-semibold mb-3">Leaderboard</h3>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 py-1.5">
            <Skeleton className="h-4 w-6" />
            <Skeleton className="h-4 flex-1" />
            <Skeleton className="h-4 w-10" />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn("rounded-lg border p-4", className)}>
        <h3 className="font-semibold mb-2">Leaderboard</h3>
        <p className="text-xs text-destructive">Failed to load.</p>
      </div>
    );
  }

  if (!data || data.entries.length === 0) {
    return (
      <div className={cn("rounded-lg border p-4", className)}>
        <h3 className="font-semibold mb-2">Leaderboard</h3>
        <p className="text-xs text-muted-foreground">No actions yet.</p>
      </div>
    );
  }

  const rankStyles: Record<number, string> = {
    1: "text-amber-400",
    2: "text-slate-400",
    3: "text-orange-400",
  };

  const title = data.actionType
    ? `Leaderboard — ${data.actionType}`
    : "Leaderboard";

  const scope =
    data.actionType && locationId
      ? `Filtered by action`
      : data.actionType
        ? `Filtered by action`
        : locationId
          ? `All actions`
          : `All actions · Global`;

  return (
    <div className={cn("rounded-lg border p-4", className)}>
      <h3 className="font-semibold text-sm mb-1">{title}</h3>
      <p className="text-[10px] text-muted-foreground mb-3">{scope}</p>

      <div className="flex flex-col gap-0.5">
        {data.entries.map((entry) => {
          const isCurrentUser = session?.user.id === entry.userId;
          const label = entry.displayName ?? `User #${entry.anonymousLabel}`;

          return (
            <div
              key={entry.userId}
              className={cn(
                "flex items-center gap-2 px-1.5 py-1 rounded text-xs",
                isCurrentUser && "bg-amber-500/10",
              )}
            >
              <span
                className={cn(
                  "w-5 text-right font-mono font-bold text-[11px]",
                  rankStyles[entry.rank] ?? "text-muted-foreground",
                )}
              >
                {entry.rank <= 3
                  ? ["🥇", "🥈", "🥉"][entry.rank - 1]
                  : `#${entry.rank}`}
              </span>

              <span
                className={cn(
                  "flex-1 truncate",
                  isCurrentUser && "font-semibold text-amber-500",
                )}
              >
                {label}
                {isCurrentUser ? " (you)" : ""}
              </span>

              <span className="font-mono text-muted-foreground tabular-nums">
                {entry.totalActions.toLocaleString()}
              </span>
            </div>
          );
        })}
      </div>

      <p className="text-[10px] text-muted-foreground mt-3">
        Top {data.entries.length}
        {locationId ? " · hover an action card to filter" : " · global"}
      </p>
    </div>
  );
}
