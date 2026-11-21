"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ActionIcon, actionStyle } from "@/components/action-icon";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { Item, ItemActions, ItemMedia, ItemTitle } from "@/components/ui/item";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { actionPhrase, formatRelativeTime } from "@/lib/live-events";
import { cn } from "@/lib/utils";
import type { LiveActionEvent } from "@/types/live";

const TICK_INTERVAL_MS = 10_000;
const SKELETON_ROW_COUNT = 6;

interface LiveActivityFeedProps {
  /** Events ordered newest first. */
  events: LiveActionEvent[];
  status: "connecting" | "live" | "reconnecting";
  isLoading: boolean;
  className?: string;
}

/** Presentational card listing anonymous live action events with a connection status badge. */
export default function LiveActivityFeed({
  events,
  status,
  isLoading,
  className,
}: LiveActivityFeedProps) {
  const isReducedMotion = useReducedMotion();
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), TICK_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  const isReconnecting = status === "reconnecting";

  return (
    <Card className={className}>
      <CardHeader className="flex items-center justify-between">
        <CardTitle>Live activity</CardTitle>
        {isReconnecting ? (
          <Badge
            role="status"
            variant="secondary"
            className="bg-amber-500/15 text-amber-700 dark:bg-amber-400/15 dark:text-amber-300"
          >
            <span className="size-1.5 rounded-full bg-amber-500 dark:bg-amber-400" />
            Reconnecting
          </Badge>
        ) : (
          <Badge
            role="status"
            variant="secondary"
            className="bg-emerald-500/15 text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-300"
          >
            <span className="relative flex size-1.5">
              {status === "live" && !isReducedMotion && (
                <span className="absolute inline-flex size-full animate-ping motion-reduce:animate-none rounded-full bg-current opacity-75" />
              )}
              <span className="relative inline-flex size-1.5 rounded-full bg-current" />
            </span>
            Live
          </Badge>
        )}
      </CardHeader>
      <ScrollArea className="max-h-72 **:data-[slot=scroll-area-viewport]:max-h-72">
        {isLoading ? (
          <div className="flex flex-col gap-2 px-4">
            {Array.from({ length: SKELETON_ROW_COUNT }, (_, index) => (
              <Skeleton
                key={index}
                className="h-14 w-full rounded-2xl motion-reduce:animate-none"
              />
            ))}
          </div>
        ) : events.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyTitle>It&apos;s quiet in here</EmptyTitle>
              <EmptyDescription>
                Run{" "}
                <code className="rounded bg-muted px-1.5 py-px font-mono text-xs text-foreground">
                  /pet
                </code>{" "}
                on someone in Discord and it shows up here straight away.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <ul className="flex flex-col gap-1 px-2">
            <AnimatePresence initial={false}>
              {events.map((event, index) => {
                const { color } = actionStyle(event.actionType);
                return (
                  <motion.li
                    key={event.id}
                    initial={isReducedMotion ? false : { y: -8, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.25 }}
                    style={{ "--act": color } as CSSProperties}
                  >
                    <Item
                      size="sm"
                      className={cn(
                        index === 0 &&
                          "bg-[color-mix(in_oklab,var(--act)_10%,transparent)]",
                      )}
                    >
                      <ItemMedia>
                        <ActionIcon actionType={event.actionType} />
                      </ItemMedia>
                      <ItemTitle>{actionPhrase(event.actionType, event.phrase)}</ItemTitle>
                      <ItemActions
                        className={cn(
                          "ml-auto text-xs",
                          index === 0
                            ? "text-foreground"
                            : "text-muted-foreground",
                        )}
                      >
                        <time dateTime={event.createdAt}>
                          {formatRelativeTime(event.createdAt, now)}
                        </time>
                      </ItemActions>
                    </Item>
                  </motion.li>
                );
              })}
            </AnimatePresence>
          </ul>
        )}
      </ScrollArea>
    </Card>
  );
}
