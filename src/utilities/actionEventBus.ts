import { EventEmitter } from "node:events";
import type { actionEvents } from "../db/schema.js";

export type ActionEventRow = typeof actionEvents.$inferSelect;

const EVENT_NAME = "action";

const emitter = new EventEmitter();
// Each open browser tab holds one listener.
emitter.setMaxListeners(0);

export function publishActionEvent(row: ActionEventRow): void {
  emitter.emit(EVENT_NAME, row);
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
