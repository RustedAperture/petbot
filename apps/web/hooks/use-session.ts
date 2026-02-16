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

export function useSession() {
  const [session, setSession] = React.useState<Session | null>(
    _cachedSession ?? null,
  );
  const [loading, setLoading] = React.useState<boolean>(
    _cachedSession === undefined,
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

    // prevent concurrent refreshes
    if (_isRefreshing) return;
    _isRefreshing = true;
    setLoading(true);

    try {
      const res = await fetch("/api/auth/session", { cache: "no-store" });
      if (!res.ok) throw new Error("failed");
      const json = await res.json();
      _cachedSession = json.session ?? null;
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
