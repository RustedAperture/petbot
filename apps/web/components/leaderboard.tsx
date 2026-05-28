"use client";

import { useSession } from "@/hooks/use-session";
import { useLeaderboard } from "@/hooks/use-leaderboard";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
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

  const rankVariants: Record<number, "default" | "secondary" | "outline"> = {
    1: "default",
    2: "secondary",
    3: "outline",
  };

  const rankEmojis = ["🥇", "🥈", "🥉"];

  return (
    <Card className={cn("w-full", className)} size="sm">
      <CardHeader className="pb-2">
        <CardTitle>{title}</CardTitle>
        <CardDescription>{scope}</CardDescription>
      </CardHeader>

      <CardContent className="pb-2">
        {isLoading ? (
          <div className="flex flex-col gap-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 py-1">
                <Skeleton className="h-5 w-8" />
                <Skeleton className="h-4 flex-1" />
                <Skeleton className="h-4 w-10" />
              </div>
            ))}
          </div>
        ) : error ? (
          <p className="text-sm text-destructive">Failed to load.</p>
        ) : !data || data.entries.length === 0 ? (
          <p className="text-sm text-muted-foreground">No actions yet.</p>
        ) : (
          <div className="flex flex-col gap-1">
            {data.entries.map((entry) => {
              const isCurrentUser = session?.user.id === entry.userId;
              const label =
                entry.displayName ?? `User #${entry.anonymousLabel}`;

              return (
                <div
                  key={entry.userId}
                  className={cn(
                    "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
                    isCurrentUser && "bg-accent",
                  )}
                >
                  <span className="w-5 text-center">
                    {entry.rank <= 3 ? (
                      rankEmojis[entry.rank - 1]
                    ) : (
                      <Badge variant="outline" className="h-4 px-1 text-[10px] font-mono">
                        {entry.rank}
                      </Badge>
                    )}
                  </span>

                  <span
                    className={cn(
                      "flex-1 truncate",
                      isCurrentUser && "font-medium",
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

      <Separator />

      <CardFooter className="pt-2">
        <p className="text-xs text-muted-foreground">
          Top {data?.entries.length ?? 0}
          {locationId ? " · hover an action card to filter" : " · global"}
        </p>
      </CardFooter>
    </Card>
  );
}
