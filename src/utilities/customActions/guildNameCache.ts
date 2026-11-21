import { listCustomActions } from "./store.js";

const REFRESH_INTERVAL_MS = 10_000;

/**
 * Holds a guild's current action names for synchronous checks. A refresh is
 * kicked off at most once per interval and never queued, so event bursts cost
 * at most one lookup per interval per cache.
 */
export function createGuildNameCache(guildId: string) {
  const names = new Set<string>();
  let lastRefreshAt = 0;
  let isRefreshing = false;

  async function refresh(): Promise<void> {
    isRefreshing = true;
    lastRefreshAt = Date.now();
    try {
      const actions = await listCustomActions("guild", guildId);
      names.clear();
      for (const action of actions) {
        names.add(action.name);
      }
    } catch {
      // keep the previous names; the next interval retries
    } finally {
      isRefreshing = false;
    }
  }

  return {
    names: names as ReadonlySet<string>,
    refresh,
    refreshIfStale(): void {
      if (!isRefreshing && Date.now() - lastRefreshAt >= REFRESH_INTERVAL_MS) {
        void refresh();
      }
    },
  };
}
