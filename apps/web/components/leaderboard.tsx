"use client";

import * as React from "react";
import { useLeaderboard } from "@/hooks/use-leaderboard";
import { ACTIONS } from "@petbot/constants";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { Skeleton } from "@/components/ui/skeleton";
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
  onActionTypeChange?: (action: string | null) => void;
  limit?: number;
  className?: string;
  context?: "guild";
}

const MAX_LIMIT = 10;

function responsiveClass(index: number): string {
  if (index < 10) {
    return "";
  }
  if (index < 15) {
    return "hidden sm:flex";
  }
  if (index < 20) {
    return "hidden md:flex";
  }
  return "hidden lg:flex";
}

export default function Leaderboard({
  locationId,
  actionType,
  onActionTypeChange,
  limit = MAX_LIMIT,
  className,
  context,
}: LeaderboardProps) {
  const { data, isLoading, error } = useLeaderboard({
    locationId,
    actionType,
    limit,
    scope: context,
  });

  const title =
    actionType && !onActionTypeChange
      ? `Leaderboard — ${actionType[0].toUpperCase()}${actionType.slice(1)}`
      : "Leaderboard";

  const scope =
    actionType && locationId
      ? "Filtered by action"
      : actionType
        ? "Filtered by action"
        : locationId
          ? "All actions"
          : "All actions · Global";

  const rankEmojis = ["🥇", "🥈", "🥉"];

  const visibleCount = data?.entries.length ?? 0;

  return (
    <Card
      className={cn(
        "self-start pb-0 bg-linear-to-b from-primary/5 to-25% dark:from-primary/10",
        className,
      )}
    >
      <CardHeader className="border-b">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle>{title}</CardTitle>
          {onActionTypeChange && (
            <NativeSelect
              aria-label="Leaderboard action"
              size="sm"
              className="w-28 shrink-0 [&_select]:rounded-lg [&_select]:text-xs"
              value={actionType ?? ""}
              onChange={(event) =>
                onActionTypeChange(event.target.value || null)
              }
            >
              <NativeSelectOption value="">All actions</NativeSelectOption>
              {Object.keys(ACTIONS).map((action) => (
                <NativeSelectOption key={action} value={action}>
                  {action[0].toUpperCase() + action.slice(1)}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          )}
        </div>
        {!onActionTypeChange && <CardDescription>{scope}</CardDescription>}
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
              const label =
                entry.displayName ?? `User #${entry.anonymousLabel}`;
              const isOutsideTopN = entry.isCurrentUser && entry.rank !== i + 1;
              const maxActions = Math.max(
                data.entries[0]?.totalActions || 1,
                1,
              );
              const relativePercent = (entry.totalActions / maxActions) * 100;

              return (
                <React.Fragment key={`${entry.anonymousLabel}-${i}`}>
                  {isOutsideTopN && <Separator className="my-1" />}
                  <div
                    className={cn(
                      "relative flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors overflow-hidden",
                      responsiveClass(i),
                      entry.isCurrentUser && "bg-amber-500/10",
                    )}
                  >
                    <div
                      className={cn(
                        "absolute inset-y-0 left-0 bg-primary/10 dark:bg-primary/20 transition-all duration-500 pointer-events-none",
                        entry.isCurrentUser &&
                          "bg-amber-500/15 dark:bg-amber-500/25",
                      )}
                      style={{ width: `${relativePercent}%` }}
                    />

                    <span className="relative z-10 w-5 text-center">
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
                        "relative z-10 flex-1 truncate",
                        entry.isCurrentUser && "font-medium text-amber-500",
                      )}
                    >
                      {label}
                      {entry.isCurrentUser ? " (you)" : ""}
                    </span>

                    <span className="relative z-10 font-mono text-xs text-muted-foreground tabular-nums">
                      {entry.totalActions.toLocaleString()}
                    </span>
                  </div>
                </React.Fragment>
              );
            })}
          </div>
        )}
      </CardContent>

      <CardFooter className="border-t bg-muted/50 pb-6">
        <p className="text-xs text-muted-foreground">
          Top {visibleCount}
          {!locationId
            ? " · global"
            : !onActionTypeChange
              ? " · hover an action card to filter"
              : ""}
        </p>
      </CardFooter>
    </Card>
  );
}
