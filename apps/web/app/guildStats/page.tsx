"use client";

import * as React from "react";
import { useSession } from "@/hooks/use-session";

export default function GuildStatsIndex() {
  const { session } = useSession();

  return (
    <main>
      <h2 className="text-lg font-semibold">Guild Stats</h2>

      {session ? (
        <p className="mt-4 text-sm text-muted-foreground">
          Use the <strong>Guild</strong> selector in the header to choose a
          guild.
        </p>
      ) : (
        <p className="mt-4 text-sm text-muted-foreground">
          Sign in to view stats for a guild.
        </p>
      )}
    </main>
  );
}
