type Listener = () => void;

const listeners = new Map<string, Set<Listener>>();

/** Calls `listener` whenever a guild's custom action definitions change; returns the unsubscribe function. */
export function onGuildActionsChanged(
  guildId: string,
  listener: Listener,
): () => void {
  let set = listeners.get(guildId);
  if (!set) {
    set = new Set();
    listeners.set(guildId, set);
  }
  set.add(listener);
  return () => {
    set.delete(listener);
    if (set.size === 0) {
      listeners.delete(guildId);
    }
  };
}

/** Single-process only: PetBot runs one instance, so an in-memory signal reaches every cache. */
export function emitGuildActionsChanged(guildId: string): void {
  for (const listener of [...(listeners.get(guildId) ?? [])]) {
    listener();
  }
}

export function guildActionListenerCount(guildId: string): number {
  return listeners.get(guildId)?.size ?? 0;
}
