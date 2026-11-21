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
import { createGuildNameCache } from "../../utilities/customActions/guildNameCache.js";
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

/** User-scoped feeds are unrestricted; the global feed shows built-ins only (empty set). */
const isUnrestricted = (filter: ActionEventFilter) => filter.userId !== undefined;

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
    const customNames =
      filter.locationId !== undefined && !isUnrestricted(filter)
        ? (await listCustomActions("guild", filter.locationId)).map((a) => a.name)
        : [];
    const rows = await listRecentActionEvents(
      isUnrestricted(filter)
        ? filter
        : { ...filter, visibility: { customNames: new Set(customNames) } },
    );
    res.json({
      events: rows.map((row) => toPublicActionEvent(row, filter.userId)),
    });
  } catch (err) {
    logger.error({ err }, "events recent error");
    res.status(500).json({ error: "server_error" });
  }
});

/**
 * GET /api/events/stream — server-sent stream of new action events.
 */
router.get("/stream", async (req: Request, res: Response) => {
  const parsed = parseFilter(req);
  if (!parsed) {
    res.status(400).json({ error: "invalid_param" });
    return;
  }

  // A guild feed checks custom events against a cached set of the guild's
  // action names, so the listener stays synchronous.
  const nameCache =
    !isUnrestricted(parsed) && parsed.locationId !== undefined
      ? createGuildNameCache(parsed.locationId)
      : null;
  const filter: ActionEventFilter = isUnrestricted(parsed)
    ? parsed
    : { ...parsed, visibility: { customNames: nameCache?.names ?? new Set() } };
  if (nameCache) {
    await nameCache.refresh();
    if (res.destroyed) {
      return;
    }
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

  unsubscribe = subscribeActionEvents((row) => {
    if (!Object.hasOwn(ACTIONS, row.actionType)) {
      nameCache?.refreshIfStale();
    }
    if (!matchesActionEventFilter(row, filter)) {
      return;
    }
    write(formatSseEvent(toPublicActionEvent(row, filter.userId)));
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
