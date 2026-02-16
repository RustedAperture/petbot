"use client";

import * as React from "react";

type Session = {
  user: {
    id: string;
    username: string;
    avatar?: string | null;
    avatarUrl?: string | null;
  };
  guilds: Array<{ id: string; name: string }>;
} | null;

// Module-scoped cache so multiple mounts (e.g. during client navigation)
// reuse the previously-fetched session and avoid flashing `loading`.
let _cachedSession: Session | undefined = undefined;
let _isRefreshing = false;
const _listeners = new Set<(s: Session | null) => void>();

// Short-lived client cache (localStorage) to reduce round-trips and avoid UI
// flashes after a full page reload. Server remains the source of truth.
const LOCALSTORAGE_KEY = "petbot_session_cache_v1";
const LOCAL_TTL_MS = 1000 * 60 * 5; // 5 minutes

function readLocalCache(): Session | undefined {
  try {
    const raw = localStorage.getItem(LOCALSTORAGE_KEY);
    if (!raw) return undefined;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") {
      localStorage.removeItem(LOCALSTORAGE_KEY);
      return undefined;
    }
    if (typeof parsed.expiresAt === "number" && Date.now() > parsed.expiresAt) {
      localStorage.removeItem(LOCALSTORAGE_KEY);
      return undefined;
    }
    return parsed.session ?? undefined;
  } catch {
    return undefined;
  }
}

function writeLocalCache(s: Session | null) {
  try {
    if (!s) {
      localStorage.removeItem(LOCALSTORAGE_KEY);
      return;
    }
    const payload = { session: s, expiresAt: Date.now() + LOCAL_TTL_MS };
    localStorage.setItem(LOCALSTORAGE_KEY, JSON.stringify(payload));
  } catch {
    // ignore
  }
}

export function useSession() {
  // If we don't yet have an in-memory cached session, try the short-lived
  // localStorage cache so the UI can render immediately on reload.
  const localCached =
    typeof window !== "undefined" && _cachedSession === undefined
      ? readLocalCache()
      : undefined;

  if (_cachedSession === undefined && localCached !== undefined) {
    _cachedSession = localCached;
  }

  const [session, setSession] = React.useState<Session | null>(
    _cachedSession ?? null,
  );
  const [loading, setLoading] = React.useState<boolean>(
    _cachedSession === undefined && localCached === undefined,
  );

  // notify other hook instances when cache changes
  React.useEffect(() => {
    const l = (s: Session | null) => setSession(s);
    _listeners.add(l);
    return () => {
      _listeners.delete(l);
    };
  }, []);

  const refresh = React.useCallback(async (force = false) => {
    // If we have a cached value and no force-refresh requested, reuse it.
    if (!force && _cachedSession !== undefined) {
      setSession(_cachedSession ?? null);
      setLoading(false);
      return;
    }

    // If in-memory cache is empty, try the short-lived localStorage cache
    if (!force && _cachedSession === undefined) {
      try {
        const cached = readLocalCache();
        if (cached !== undefined) {
          _cachedSession = cached;
          _listeners.forEach((fn) => fn(_cachedSession ?? null));
          setSession(_cachedSession ?? null);
          setLoading(false);
          return;
        }
      } catch {
        /* ignore local cache errors */
      }
    }

    // prevent concurrent refreshes
    if (_isRefreshing) return;
    _isRefreshing = true;
    setLoading(true);

    try {
      const res = await fetch("/api/auth/session", { cache: "no-store" });
      if (!res.ok) throw new Error("failed");
      const json = await res.json();
      _cachedSession = json.session ?? null;

      // update short-lived local cache for faster reloads
      try {
        writeLocalCache(_cachedSession ?? null);
      } catch {
        /* ignore */
      }

      _listeners.forEach((fn) => fn(_cachedSession ?? null));
      setSession(_cachedSession ?? null);
    } catch (err) {
      _cachedSession = null;
      _listeners.forEach((fn) => fn(null));
      setSession(null);
    } finally {
      _isRefreshing = false;
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    // Only fetch on first mount if we haven't cached the session.
    if (_cachedSession === undefined) {
      void refresh();
    }
  }, [refresh]);

  return {
    session,
    loading,
    refresh,
    signIn: () => (window.location.href = "/api/auth/discord"),
    signOut: async () => {
      // optimistic UI update so the user sees immediate feedback
      _cachedSession = null;
      try {
        writeLocalCache(null);
      } catch {
        /* ignore */
      }
      _listeners.forEach((fn) => fn(null));
      setSession(null);
      setLoading(false);

      try {
        // perform server logout (clears cookie)
        await fetch("/api/auth/logout", {
          method: "GET",
          credentials: "same-origin",
        });
      } catch (err) {
        // ignore network errors — UI already updated optimistically
      }

      // ensure client session reflects server truth after logout
      await refresh(true);
    },
  } as const;
}
