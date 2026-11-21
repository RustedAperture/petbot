import { and, desc, eq, lt, or, type SQL } from "drizzle-orm";
import { drizzleDb } from "../db/connector.js";
import { actionEvents } from "../db/schema.js";
import logger from "../logger.js";
import { hashUserId } from "./crypto.js";
import { publishActionEvent, type ActionEventRow } from "./actionEventBus.js";

export type ActionEventFilter = { locationId?: string; userId?: string };

export type PublicActionEvent = {
  id: number;
  actionType: string;
  createdAt: string;
  role?: "performed" | "received" | "both";
};

const RETENTION_MS = 30 * 24 * 60 * 60 * 1000;
const PRUNE_INTERVAL_MS = 60 * 60 * 1000;

function userCondition(userId: string): SQL | undefined {
  const hash = hashUserId(userId);
  return or(
    eq(actionEvents.performerHash, hash),
    eq(actionEvents.targetHash, hash),
  );
}

/** Store an anonymised action event and publish it to live subscribers. */
export async function recordActionEvent(input: {
  actionType: string;
  performerId: string;
  targetId: string;
  locationId: string | null;
}): Promise<ActionEventRow> {
  const [row] = await drizzleDb
    .insert(actionEvents)
    .values({
      actionType: input.actionType,
      performerHash: hashUserId(input.performerId),
      targetHash: hashUserId(input.targetId),
      locationId: input.locationId,
      createdAt: new Date().toISOString(),
    })
    .returning();
  publishActionEvent(row);
  return row;
}

export async function listRecentActionEvents(
  filter: ActionEventFilter,
  limit = 50,
): Promise<ActionEventRow[]> {
  const conditions: SQL[] = [];
  if (filter.locationId !== undefined) {
    conditions.push(eq(actionEvents.locationId, filter.locationId));
  }
  if (filter.userId !== undefined) {
    const condition = userCondition(filter.userId);
    if (condition) {
      conditions.push(condition);
    }
  }
  return drizzleDb
    .select()
    .from(actionEvents)
    .where(and(...conditions))
    .orderBy(desc(actionEvents.createdAt), desc(actionEvents.id))
    .limit(limit);
}

export function matchesActionEventFilter(
  row: ActionEventRow,
  filter: ActionEventFilter,
): boolean {
  if (filter.locationId !== undefined && row.locationId !== filter.locationId) {
    return false;
  }
  if (filter.userId !== undefined) {
    const hash = hashUserId(filter.userId);
    if (row.performerHash !== hash && row.targetHash !== hash) {
      return false;
    }
  }
  return true;
}

/** Strip hashes and location; add the viewer's role only when a user is given. */
export function toPublicActionEvent(
  row: ActionEventRow,
  userId?: string,
): PublicActionEvent {
  const event: PublicActionEvent = {
    id: row.id,
    actionType: row.actionType,
    createdAt: row.createdAt,
  };
  if (userId === undefined) {
    return event;
  }
  const hash = hashUserId(userId);
  const isPerformer = row.performerHash === hash;
  const isTarget = row.targetHash === hash;
  if (isPerformer && isTarget) {
    event.role = "both";
  } else if (isPerformer) {
    event.role = "performed";
  } else if (isTarget) {
    event.role = "received";
  }
  return event;
}

export async function pruneActionEvents(now = new Date()): Promise<void> {
  const cutoff = new Date(now.getTime() - RETENTION_MS).toISOString();
  await drizzleDb
    .delete(actionEvents)
    .where(lt(actionEvents.createdAt, cutoff));
}

export async function deleteActionEventsForUser(userId: string): Promise<void> {
  await drizzleDb.delete(actionEvents).where(userCondition(userId));
}

/** Prune immediately, then hourly. Returns a function that stops the timer. */
export function startActionEventPruning(): () => void {
  const prune = () => {
    pruneActionEvents().catch((error) => {
      logger.error({ err: error }, "Failed to prune action events");
    });
  };
  prune();
  const timer = setInterval(prune, PRUNE_INTERVAL_MS);
  timer.unref();
  return () => clearInterval(timer);
}
