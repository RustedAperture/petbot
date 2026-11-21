import logger from "../../logger.js";
import { listCustomActions } from "./store.js";

const TTL_MS = 10_000;

/**
 * Holds a guild's current action names. Once the entry expires, every caller
 * awaits the one shared in-flight load, so a burst costs one lookup per TTL
 * and nothing queues. A failed load clears the names (custom events are then
 * dropped) until a later load succeeds.
 */
export function createGuildNameCache(guildId: string) {
  const names = new Set<string>();
  let expiresAt = 0;
  let inFlight: Promise<void> | null = null;

  function load(): Promise<void> {
    inFlight ??= (async () => {
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
        expiresAt = Date.now() + TTL_MS;
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
    /** Forces a load even when fresh, sharing any load already in flight. */
    refresh(): Promise<void> {
      return load();
    },
    /** Whether the guild currently defines `name`; waits for a fresh load when expired. */
    hasName(name: string): boolean | Promise<boolean> {
      if (Date.now() < expiresAt) {
        return names.has(name);
      }
      return load().then(() => names.has(name));
    },
  };
}
