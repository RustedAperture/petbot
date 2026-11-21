import { EventEmitter } from "node:events";
import type { actionEvents } from "../db/schema.js";
import logger from "../logger.js";

export type ActionEventRow = typeof actionEvents.$inferSelect;

const EVENT_NAME = "action";

const emitter = new EventEmitter();
// Each open browser tab holds one listener.
emitter.setMaxListeners(0);

/** Delivers to every subscriber; one that throws is logged and skipped. */
export function publishActionEvent(row: ActionEventRow): void {
  for (const listener of emitter.listeners(EVENT_NAME)) {
    try {
      listener(row);
    } catch (error) {
      logger.error({ err: error }, "Action event subscriber failed");
    }
  }
}

/** Subscribe to new action events. Returns an unsubscribe function. */
export function subscribeActionEvents(
  listener: (row: ActionEventRow) => void,
): () => void {
  emitter.on(EVENT_NAME, listener);
  return () => {
    emitter.off(EVENT_NAME, listener);
  };
}

export function actionEventListenerCount(): number {
  return emitter.listenerCount(EVENT_NAME);
}
