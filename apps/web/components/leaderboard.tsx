"use client";

import { useSession } from "@/hooks/use-session";
import { useLeaderboard } from "@/hooks/use-leaderboard";
import { Skeleton } from "@/components/ui/skeleton";

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface LeaderboardProps {
  locationId: string | null;
  actionType: string | null;
  limit?: number;
  className?: string;
}

const MAX_LIMIT = 15;

function responsiveClass(index: number): string {
  if (index < 10) return "";
  if (index < 15) return "hidden sm:flex";
  if (index < 20) return "hidden md:flex";
  return "hidden lg:flex";
}

export default function Leaderboard({
  locationId,
  actionType,
  limit = MAX_LIMIT,
  className,
}: LeaderboardProps) {
  const { session } = useSession();
  const { data, isLoading, error } = useLeaderboard({
    locationId,
    actionType,
    limit,
  });

  const title = data?.actionType
    ? `Leaderboard — ${data.actionType}`
    : "Leaderboard";

  const scope =
    data?.actionType && locationId
      ? "Filtered by action"
      : data?.actionType
        ? "Filtered by action"
        : locationId
          ? "All actions"
          : "All actions · Global";

  const rankEmojis = ["🥇", "🥈", "🥉"];

  const visibleCount = data?.entries.length ?? 0;

  return (
    <Card
      className={cn(
        "self-start pb-0 bg-linear-to-b from-primary/10 to-25% dark:from-primary/15",
        className,
      )}
    >
      <CardHeader className="pb-6 border-b">
        <CardTitle>{title}</CardTitle>
        <CardDescription>{scope}</CardDescription>
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <div className="flex flex-col gap-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 py-1.5">
                <Skeleton className="h-5 w-8" />
                <Skeleton className="h-4 flex-1" />
                <Skeleton className="h-4 w-10" />
              </div>
            ))}
          </div>
        ) : error ? (
          <p className="text-sm text-destructive">Failed to load.</p>
        ) : !data || visibleCount === 0 ? (
          <p className="text-sm text-muted-foreground">No actions yet.</p>
        ) : (
          <div className="flex flex-col gap-1">
            {data.entries.map((entry, i) => {
              const isCurrentUser = session?.user.id === entry.userId;
              const label =
                entry.displayName ?? `User #${entry.anonymousLabel}`;

              return (
                <div
                  key={entry.userId}
                  className={cn(
                    "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
                    responsiveClass(i),
                    isCurrentUser && "bg-amber-500/10",
                  )}
                >
                  <span className="w-5 text-center">
                    {entry.rank <= 3 ? (
                      rankEmojis[entry.rank - 1]
                    ) : (
                      <span className="text-[10px] font-mono text-muted-foreground">
                        {entry.rank}
                      </span>
                    )}
                  </span>

                  <span
                    className={cn(
                      "flex-1 truncate",
                      isCurrentUser && "font-medium text-amber-500",
                    )}
                  >
                    {label}
                    {isCurrentUser ? " (you)" : ""}
                  </span>

                  <span className="font-mono text-xs text-muted-foreground tabular-nums">
                    {entry.totalActions.toLocaleString()}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>

      <CardFooter className="border-t bg-muted/50 pb-6">
        <p className="text-xs text-muted-foreground">
          Top {visibleCount}
          {locationId ? " · hover an action card to filter" : " · global"}
        </p>
      </CardFooter>
    </Card>
  );
}
