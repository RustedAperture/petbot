"use client";

import * as React from "react";

type Session = {
  user: { id: string; username: string; avatar?: string | null };
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
      await fetch("/api/auth/logout");
      await refresh();
    },
  } as const;
}
