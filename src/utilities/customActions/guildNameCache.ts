import logger from "../../logger.js";
import { listCustomActions } from "./store.js";
import { onGuildActionsChanged } from "./changeEvents.js";

const TTL_MS = 10_000;

/**
 * Holds a guild's current action names. Once the entry expires, every caller
 * awaits the one shared in-flight load, so a burst costs one lookup per TTL
 * and nothing queues. A change to the guild's actions expires the entry at
 * once (call `dispose` to stop listening). A failed load clears the names (custom events are then
 * dropped) until a later load succeeds.
 */
export function createGuildNameCache(guildId: string) {
  const names = new Set<string>();
  let expiresAt = 0;
  let inFlight: Promise<void> | null = null;
  let generation = 0;
  const unsubscribe = onGuildActionsChanged(guildId, () => {
    generation += 1;
    expiresAt = 0;
  });

  function load(): Promise<void> {
    inFlight ??= (async () => {
      const startedAt = generation;
      try {
        const actions = await listCustomActions("guild", guildId);
        names.clear();
        for (const action of actions) {
          names.add(action.name);
        }
      } catch (err) {
        names.clear();
        logger.error({ err, guildId }, "Failed to load guild action names");
      } finally {
        // A change during the load makes its result stale.
        expiresAt = generation === startedAt ? Date.now() + TTL_MS : 0;
        inFlight = null;
      }
    })();
    return inFlight;
  }

  return {
    /** Starts a load without waiting for it. */
    prefetch(): void {
      void load();
    },
    dispose: unsubscribe,
    /** Whether the guild currently defines `name`; waits for a fresh load when expired. */
    hasName(name: string): boolean | Promise<boolean> {
      if (Date.now() < expiresAt) {
        return names.has(name);
      }
      return load().then(() => names.has(name));
    },
  };
}
