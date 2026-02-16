"use client";

import * as React from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useSession } from "@/hooks/use-session";
import { useGlobalStats } from "@/hooks/use-global-stats";
import StatsCard from "@/components/stats/stats-card";
import StatsCardSimple from "@/components/stats/stats-card-simple";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function DmStatsPage() {
  const params = useSearchParams();
  const router = useRouter();
  const queryLocationId = params.get("locationId") || params.get("guildId");
  const { session } = useSession();

  const resolvedLocationId = queryLocationId ?? null;
  const [locationInput, setLocationInput] = React.useState(
    queryLocationId ?? "",
  );

  // transient UI state: show a short message when a user-initiated update fails with 404
  const [loadErrorMessage, setLoadErrorMessage] = React.useState<string | null>(
    null,
  );
  const [failedLocationId, setFailedLocationId] = React.useState<string | null>(
    null,
  );
  const userInitiatedRef = React.useRef(false);
  const attemptedLocationRef = React.useRef<string | null>(null);

  // restore any transient failed-location id that was persisted across a replace()
  React.useEffect(() => {
    try {
      const stored = sessionStorage.getItem("dmStatsFailedLocation");
      if (stored) {
        setFailedLocationId(stored);
        sessionStorage.removeItem("dmStatsFailedLocation");
      }
    } catch {
      /* noop */
    }
  }, []);

  const { data, isLoading, error } = useGlobalStats({
    guildId: resolvedLocationId,
    userId: session?.user.id ?? null,
  });

  const submitLocation = React.useCallback(
    (e?: React.FormEvent) => {
      e?.preventDefault();
      const trimmed = locationInput?.trim();
      if (!trimmed) {
        return;
      }
      // mark that this navigation was initiated by the user so we can special-case 404
      userInitiatedRef.current = true;
      attemptedLocationRef.current = trimmed;
      setLoadErrorMessage(null);
      try {
        sessionStorage.removeItem("dmStatsFailedLocation");
      } catch {
        /* noop */
      }
      router.push(`/dmStats?locationId=${encodeURIComponent(trimmed)}`);
    },
    [locationInput, router],
  );

  const clearLocation = React.useCallback(() => {
    // reset transient UI state and clear the input, then remove the query param
    setLoadErrorMessage(null);
    setFailedLocationId(null);
    try {
      sessionStorage.removeItem("dmStatsFailedLocation");
    } catch {
      /* noop */
    }
    userInitiatedRef.current = false;
    attemptedLocationRef.current = null;
    setLocationInput("");
    router.push("/dmStats");
  }, [router]);

  // If no locationId provided, the header contains the input — page shows guidance.

  // If a 404 occurs for a location-scoped request, always fall back to the
  // regular DM page and show an error message (do not keep showing stale stats).
  React.useEffect(() => {
    if (!error) {
      return;
    }
    const isNotFound = String(error?.message).includes("(404)");
    if (!isNotFound) {
      return;
    }

    // Determine the id we attempted to load (user input, attempted ref, or current query)
    const failed =
      attemptedLocationRef.current ??
      locationInput ??
      resolvedLocationId ??
      null;
    attemptedLocationRef.current = null;
    userInitiatedRef.current = false;
    setLocationInput("");

    if (failed) {
      setFailedLocationId(failed);
      try {
        sessionStorage.setItem("dmStatsFailedLocation", failed);
      } catch {
        /* noop */
      }
    } else {
      const msg =
        "No DM stats found for that location or you do not have access.";
      setLoadErrorMessage(msg);
      try {
        sessionStorage.setItem("dmStatsFailedLocation", "");
      } catch {
        /* noop */
      }
    }

    // If we were location-scoped, remove the query param and show the fallback UI.
    if (resolvedLocationId) {
      router.replace("/dmStats");
    }
  }, [error, router, locationInput, resolvedLocationId]);

  // Clear transient load message when location-scoped data successfully loads.
  // Do NOT clear the message when *global* data refreshes after we replaced the URL —
  // that caused the message to vanish immediately for a bad location id.
  React.useEffect(() => {
    if (data && resolvedLocationId) {
      setLoadErrorMessage(null);
      setFailedLocationId(null);
      try {
        sessionStorage.removeItem("dmStatsFailedLocation");
      } catch {
        /* noop */
      }
    }
  }, [data, resolvedLocationId]);
  // If there's a 404 while trying to load a location, we replace the URL
  // and fall back to the default /dmStats page with an error message. Also
  // short-circuit here so we don't accidentally continue rendering stale data.
  if (error && String(error?.message).includes("(404)") && resolvedLocationId) {
    return (
      <main>
        <h2 className="text-lg font-semibold">DM Chat Stats</h2>

        {!session ? (
          <p className="mt-4 text-sm text-muted-foreground">
            Sign in to view DM chat stats for a location.
          </p>
        ) : (
          <>
            <p className="mt-4 text-sm text-muted-foreground">
              Use the <strong>DM</strong> input in the header to view stats for
              a channel or guild.
            </p>

            <p className="mt-2 text-sm text-muted-foreground">
              Tip: right‑click the chat and select{" "}
              <code className="font-mono">Copy Channel ID</code> to get the
              location id.
            </p>

            <p className="mt-4 text-sm text-muted-foreground">
              No DM stats found for location{" "}
              <strong>{resolvedLocationId}</strong> or you do not have access.
            </p>
          </>
        )}
      </main>
    );
  }

  if (!resolvedLocationId) {
    return (
      <main>
        <h2 className="text-lg font-semibold">DM Chat Stats</h2>

        {!session ? (
          <p className="mt-4 text-sm text-muted-foreground">
            Sign in to view DM chat stats for a location.
          </p>
        ) : (
          <>
            <p className="mt-4 text-sm text-muted-foreground">
              Use the <strong>DM</strong> input in the header to view stats for
              a channel or guild.
            </p>

            <p className="mt-2 text-sm text-muted-foreground">
              Tip: right‑click the chat and select{" "}
              <code className="font-mono">Copy Channel ID</code> to get the
              location id.
            </p>

            {failedLocationId ? (
              <p className="mt-4 text-sm text-muted-foreground">
                No DM stats found for location{" "}
                <strong>{failedLocationId}</strong> or you do not have access.
              </p>
            ) : loadErrorMessage ? (
              <p className="mt-4 text-sm text-destructive">
                {loadErrorMessage}
              </p>
            ) : null}
          </>
        )}
      </main>
    );
  }

  // Show page-level loader / error when trying to load a location's stats
  if (!data && isLoading) {
    return (
      <p className="mt-4 text-sm text-muted-foreground">Loading DM stats…</p>
    );
  }

  if (!data && error) {
    const isNotFound = error.message.includes("(404)");
    return (
      <main>
        <h2 className="text-lg font-semibold">DM Chat Stats</h2>
        <div className="mt-4 text-sm">
          {isNotFound ? (
            <div className="text-muted-foreground">
              No DM stats found for location{" "}
              <strong>{resolvedLocationId}</strong> or you do not have access.
            </div>
          ) : (
            <div className="text-destructive">
              Failed to load stats: {error.message}
            </div>
          )}

          <div className="mt-4 flex gap-2">
            <Input
              value={resolvedLocationId}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                setLocationInput(e.target.value);
                setLoadErrorMessage(null);
                setFailedLocationId(null);
                try {
                  sessionStorage.removeItem("dmStatsFailedLocation");
                } catch {
                  /* noop */
                }
              }}
            />
            <Button onClick={submitLocation}>Try</Button>
            <Button variant="ghost" onClick={clearLocation}>
              Clear
            </Button>
          </div>
        </div>
      </main>
    );
  }

  if (!data) {
    return <p className="mt-4 text-sm text-muted-foreground">No data</p>;
  }

  const entries = Object.entries(data.totalsByAction) as Array<[string, any]>;

  return (
    <main>
      <div
        className={`flex flex-col gap-4 ${isLoading ? "opacity-80" : ""}`}
        aria-busy={isLoading}
      >
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-2">
          <StatsCardSimple
            statString="Total Actions Performed"
            value={data.totalActionsPerformed}
          />
          <StatsCardSimple
            statString="Total Unique Users"
            value={data.totalUniqueUsers}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {entries.map(([actionKey, totals]) => (
            <StatsCard
              key={actionKey}
              actionName={actionKey}
              actionImageUrl={totals.imageUrl}
              performedCount={totals.totalHasPerformed}
              userCount={totals.totalUsers}
              totalUniqueUsers={data.totalUniqueUsers}
              totalActionsPerformed={data.totalActionsPerformed}
            />
          ))}
        </div>
      </div>

      {error ? (
        <div className="mt-4 text-sm text-destructive">
          Failed to load stats: {error.message}
        </div>
      ) : null}
    </main>
  );
}
