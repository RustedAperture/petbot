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

export function useSession() {
  const [session, setSession] = React.useState<Session | null>(null);
  const [loading, setLoading] = React.useState(true);

  const refresh = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/auth/session", { cache: "no-store" });
      if (!res.ok) throw new Error("failed");
      const json = await res.json();
      setSession(json.session ?? null);
    } catch (err) {
      setSession(null);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  return {
    session,
    loading,
    refresh,
    signIn: () => (window.location.href = "/api/auth/discord"),
    signOut: async () => {
      // optimistic UI update so the user sees immediate feedback
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
      await refresh();
    },
  } as const;
}
