import * as React from "react";
import type { LiveActionEvent, LiveScope } from "@/types/live";
import { liveEventsPath } from "@/lib/live-events";

const MAX_EVENTS = 50;
const INITIAL_BACKOFF_MS = 1000;
const MAX_BACKOFF_MS = 30000;

type LiveStatus = "connecting" | "live" | "reconnecting";

type UseLiveEventsOptions = {
  onEvent?: (event: LiveActionEvent) => void;
  onReconnect?: () => void;
};

type UseLiveEventsResult = {
  events: LiveActionEvent[];
  status: LiveStatus;
  isLoading: boolean;
  latestLiveEvent: LiveActionEvent | null;
};

const IDLE_RESULT: UseLiveEventsResult = {
  events: [],
  status: "connecting",
  isLoading: false,
  latestLiveEvent: null,
};

/**
 * Backfills recent actions for `scope` and keeps them current over SSE.
 * - `scope === null` does nothing (e.g. while the session loads).
 * - Events are newest first, deduped by id, capped at 50.
 * - `onEvent` fires only for new stream events, never the backfill.
 * - A source the browser gave up on (non-200) is recreated with backoff.
 * - `onReconnect` fires on each open that follows a drop, so callers can resync.
 */
export function useLiveEvents(
  scope: LiveScope | null,
  options: UseLiveEventsOptions = {},
): UseLiveEventsResult {
  const [events, setEvents] = React.useState<LiveActionEvent[]>([]);
  const [status, setStatus] = React.useState<LiveStatus>("connecting");
  const [isLoading, setIsLoading] = React.useState<boolean>(scope !== null);
  const [latestLiveEvent, setLatestLiveEvent] =
    React.useState<LiveActionEvent | null>(null);

  const onEventRef = React.useRef(options.onEvent);
  const onReconnectRef = React.useRef(options.onReconnect);
  React.useEffect(() => {
    onEventRef.current = options.onEvent;
    onReconnectRef.current = options.onReconnect;
  });

  const scopeKey = scope ? liveEventsPath(scope) : null;

  React.useEffect(() => {
    if (scopeKey === null) {
      return;
    }
    let isActive = true;
    let es: EventSource | null = null;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    let backoffMs = INITIAL_BACKOFF_MS;
    let isReconnecting = false;
    const seenIds = new Set<number>();

    /* eslint-disable react-hooks/set-state-in-effect */
    setEvents([]);
    setLatestLiveEvent(null);
    setStatus("connecting");
    setIsLoading(true);
    /* eslint-enable react-hooks/set-state-in-effect */

    const handleAction = (message: MessageEvent) => {
      let event: LiveActionEvent;
      try {
        event = JSON.parse(message.data as string) as LiveActionEvent;
      } catch {
        return;
      }
      if (seenIds.has(event.id)) {
        return;
      }
      seenIds.add(event.id);
      setEvents((prev) => [event, ...prev].slice(0, MAX_EVENTS));
      setLatestLiveEvent(event);
      onEventRef.current?.(event);
    };

    const connect = () => {
      const source = new EventSource(`${scopeKey}/stream`);
      es = source;
      source.onopen = () => {
        backoffMs = INITIAL_BACKOFF_MS;
        setStatus("live");
        if (isReconnecting) {
          isReconnecting = false;
          onReconnectRef.current?.();
        }
      };
      source.onerror = () => {
        isReconnecting = true;
        setStatus("reconnecting");
        if (source.readyState === EventSource.CLOSED) {
          source.close();
          retryTimer = setTimeout(connect, backoffMs);
          backoffMs = Math.min(backoffMs * 2, MAX_BACKOFF_MS);
        }
      };
      source.addEventListener("action", handleAction);
    };

    const backfill = async () => {
      try {
        const res = await fetch(scopeKey, { cache: "no-store" });
        if (!res.ok) {
          return;
        }
        const body = (await res.json()) as { events?: LiveActionEvent[] };
        if (!isActive) {
          return;
        }
        const backfilled = (body.events ?? []).slice(0, MAX_EVENTS);
        const fresh = backfilled.filter((event) => !seenIds.has(event.id));
        fresh.forEach((event) => seenIds.add(event.id));
        // Stream events may have arrived first; ids are monotonic, so id order is recency order.
        setEvents((prev) =>
          [...prev, ...fresh].sort((a, b) => b.id - a.id).slice(0, MAX_EVENTS),
        );
      } catch {
        // The stream still works without a backfill.
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    };

    connect();
    void backfill();

    return () => {
      isActive = false;
      if (retryTimer) {
        clearTimeout(retryTimer);
      }
      es?.close();
    };
  }, [scopeKey]);

  if (scopeKey === null) {
    return IDLE_RESULT;
  }

  return { events, status, isLoading, latestLiveEvent };
}
