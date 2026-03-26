"use client";

import * as React from "react";
import { useSession } from "@/hooks/use-session";

export default function DmStatsIndex() {
  const { session } = useSession();

  return (
    <main>
      <h2 className="text-lg font-semibold">DM Chat Stats</h2>

      {session ? (
        <>
          <p className="mt-4 text-sm text-muted-foreground">
            Use the <strong>DM</strong> input in the header to view stats for a
            channel or guild.
          </p>

          <p className="mt-2 text-sm text-muted-foreground">
            Tip: right-click the chat and select{" "}
            <code className="font-mono">Copy Channel ID</code> to get the
            location id.
          </p>
        </>
      ) : (
        <p className="mt-4 text-sm text-muted-foreground">
          Sign in to view DM chat stats for a location.
        </p>
      )}
    </main>
  );
}
