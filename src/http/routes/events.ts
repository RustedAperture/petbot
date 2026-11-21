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
    const rows = await listRecentActionEvents(filter);
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

  const unsubscribe = subscribeActionEvents((row) => {
    if (matchesActionEventFilter(row, filter)) {
      res.write(formatSseEvent(toPublicActionEvent(row, filter.userId)));
    }
  });
  const pingTimer = setInterval(
    () => res.write(": ping\n\n"),
    PING_INTERVAL_MS,
  );

  req.on("close", () => {
    unsubscribe();
    clearInterval(pingTimer);
  });
});

export default router;
