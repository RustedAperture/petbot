import type { GlobalStats } from "@/types/stats";
import type { LiveActionEvent, LiveCountMode, LiveScope } from "@/types/live";

const IRREGULAR_PHRASES: Record<string, string> = {
  pet: "Someone got petted",
  hug: "Someone got hugged",
  bonk: "Someone got bonked",
  bite: "Someone got bitten",
  squish: "Someone got squished",
  explode: "Someone exploded",
};

/** Relay path for a scope; the SSE stream is this path plus `/stream`. */
export function liveEventsPath(scope: LiveScope): string {
  switch (scope.kind) {
    case "global":
      return "/api/events";
    case "guild":
      return `/api/events/guild/${encodeURIComponent(scope.guildId)}`;
    case "user":
      return `/api/events/user/${encodeURIComponent(scope.userId)}`;
    case "userLocation":
      return `/api/events/user/${encodeURIComponent(scope.userId)}/location/${encodeURIComponent(scope.locationId)}`;
  }
}

export function countsAsPerformed(event: LiveActionEvent): boolean {
  return event.role !== "received";
}

/** Key for the "Total Actions Performed" +1 flash; undefined when the event does not bump that total in `mode`. */
export function flashKeyFor(
  event: LiveActionEvent | null,
  mode: LiveCountMode,
): number | undefined {
  if (!event) {
    return undefined;
  }
  return mode === "location" || countsAsPerformed(event) ? event.id : undefined;
}

/** Returns new stats with the event applied; the input is not mutated. */
export function applyLiveEvent(
  stats: GlobalStats,
  event: LiveActionEvent,
  mode: LiveCountMode,
): GlobalStats {
  const isPerformed = mode === "location" || countsAsPerformed(event);
  const isReceived =
    mode === "user" && (event.role === "received" || event.role === "both");
  const current = Object.hasOwn(stats.totalsByAction, event.actionType)
    ? stats.totalsByAction[event.actionType]
    : undefined;

  return {
    ...stats,
    totalActionsPerformed: stats.totalActionsPerformed + (isPerformed ? 1 : 0),
    totalsByAction: current
      ? {
          ...stats.totalsByAction,
          [event.actionType]: {
            ...current,
            totalHasPerformed:
              current.totalHasPerformed + (isPerformed ? 1 : 0),
            totalHasReceived:
              (current.totalHasReceived ?? 0) + (isReceived ? 1 : 0),
          },
        }
      : stats.totalsByAction,
  };
}

export function actionPhrase(actionType: string): string {
  if (Object.hasOwn(IRREGULAR_PHRASES, actionType)) {
    return IRREGULAR_PHRASES[actionType];
  }
  return `Someone got ${actionType}${actionType.endsWith("e") ? "d" : "ed"}`;
}

export function formatRelativeTime(createdAt: string, now: Date): string {
  const seconds = Math.floor(
    (now.getTime() - new Date(createdAt).getTime()) / 1000,
  );
  if (!(seconds >= 5)) {
    return "now";
  }
  if (seconds < 60) {
    return `${seconds}s`;
  }
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `${minutes}m`;
  }
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours}h`;
  }
  return `${Math.floor(hours / 24)}d`;
}
