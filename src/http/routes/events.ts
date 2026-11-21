import { Router } from "express";
import type { Request, Response } from "express";
import logger from "../../logger.js";
import {
  listRecentActionEvents,
  matchesActionEventFilter,
  toPublicActionEvent,
  type ActionEventFilter,
  type PublicActionEvent,
} from "../../utilities/actionEvents.js";
import { ACTIONS } from "../../types/constants.js";
import { listCustomActions } from "../../utilities/customActions/store.js";
import { subscribeActionEvents } from "../../utilities/actionEventBus.js";

const PING_INTERVAL_MS = 25_000;
const NUMERIC_ID = /^\d+$/;

const router = Router();

/** Frame one event for an SSE stream. */
export function formatSseEvent(event: PublicActionEvent): string {
  return `id: ${event.id}\nevent: action\ndata: ${JSON.stringify(event)}\n\n`;
}

/** Returns null when a provided param is not a single numeric string. */
function parseFilter(req: Request): ActionEventFilter | null {
  const filter: ActionEventFilter = {};
  for (const key of ["locationId", "userId"] as const) {
    const value = req.query[key];
    if (value === undefined) {
      continue;
    }
    if (typeof value !== "string" || !NUMERIC_ID.test(value)) {
      return null;
    }
    filter[key] = value;
  }
  return filter;
}

const isBuiltIn = (actionType: string) => Object.hasOwn(ACTIONS, actionType);

/**
 * Global feeds show built-ins only; a guild feed adds that guild's current
 * actions. User-scoped feeds are unrestricted.
 */
function visibilityWithoutLookup(
  filter: ActionEventFilter,
): ((actionType: string) => boolean) | null {
  if (filter.userId !== undefined) {
    return () => true;
  }
  return filter.locationId === undefined ? isBuiltIn : null;
}

async function createVisibility(
  filter: ActionEventFilter,
): Promise<(actionType: string) => boolean> {
  const simple = visibilityWithoutLookup(filter);
  if (simple) {
    return simple;
  }
  const guildNames = new Set(
    (await listCustomActions("guild", filter.locationId as string)).map((a) => a.name),
  );
  return (actionType) => isBuiltIn(actionType) || guildNames.has(actionType);
}

/**
 * GET /api/events/recent — latest anonymised action events.
 */
router.get("/recent", async (req: Request, res: Response) => {
  const filter = parseFilter(req);
  if (!filter) {
    res.status(400).json({ error: "invalid_param" });
    return;
  }

  try {
    const [rows, isVisible] = await Promise.all([
      listRecentActionEvents(filter),
      createVisibility(filter),
    ]);
    res.json({
      events: rows
        .filter((row) => isVisible(row.actionType))
        .map((row) => toPublicActionEvent(row, filter.userId)),
    });
  } catch (err) {
    logger.error({ err }, "events recent error");
    res.status(500).json({ error: "server_error" });
  }
});

/**
 * GET /api/events/stream — server-sent stream of new action events.
 */
router.get("/stream", (req: Request, res: Response) => {
  const filter = parseFilter(req);
  if (!filter) {
    res.status(400).json({ error: "invalid_param" });
    return;
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  let isStopped = false;
  let unsubscribe = () => {};

  const stop = () => {
    if (isStopped) {
      return;
    }
    isStopped = true;
    unsubscribe();
    clearInterval(pingTimer);
  };

  // A reader that stops draining would grow the buffer without bound. Stop the
  // producers and destroy now: a graceful end() would stay queued behind the
  // unread data and leave them running.
  const write = (chunk: string) => {
    if (isStopped) {
      return;
    }
    if (!res.write(chunk)) {
      stop();
      res.destroy();
    }
  };

  // Guild feeds need a lookup per event; chaining keeps events in order. The
  // other feeds stay synchronous so a backpressured write stops them at once.
  const simpleVisibility = visibilityWithoutLookup(filter);
  let pending: Promise<void> = Promise.resolve();
  unsubscribe = subscribeActionEvents((row) => {
    if (!matchesActionEventFilter(row, filter)) {
      return;
    }
    if (simpleVisibility) {
      if (simpleVisibility(row.actionType)) {
        write(formatSseEvent(toPublicActionEvent(row, filter.userId)));
      }
      return;
    }
    pending = pending.then(async () => {
      try {
        const isVisible = await createVisibility(filter);
        if (isVisible(row.actionType)) {
          write(formatSseEvent(toPublicActionEvent(row, filter.userId)));
        }
      } catch (err) {
        logger.error({ err }, "events stream error");
      }
    });
  });
  const pingTimer = setInterval(() => write(": ping\n\n"), PING_INTERVAL_MS);
  // Downstream proxies only flush headers with the first body chunk; without
  // this the client's onopen waits for the first event or ping.
  write(": connected\n\n");

  // Tied to the response: a GET body consumed by express.json fires the
  // request's "close" while the stream is still open.
  res.once("close", stop);
});

export default router;
