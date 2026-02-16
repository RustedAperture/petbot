"use client";

import * as React from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useSession } from "@/hooks/use-session";
import { useGlobalStats } from "@/hooks/use-global-stats";
import StatsCard from "@/components/stats/stats-card";
import StatsCardSimple from "@/components/stats/stats-card-simple";
import { Card, CardContent } from "@/components/ui/card";
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
    } catch {}
  }, []);

  const { data, isLoading, error } = useGlobalStats({
    guildId: resolvedLocationId,
    userId: session?.user.id ?? null,
  });

  const submitLocation = React.useCallback(
    (e?: React.FormEvent) => {
      e?.preventDefault();
      const trimmed = locationInput?.trim();
      if (!trimmed) return;
      // mark that this navigation was initiated by the user so we can special-case 404
      userInitiatedRef.current = true;
      attemptedLocationRef.current = trimmed;
      setLoadErrorMessage(null);
      try {
        sessionStorage.removeItem("dmStatsFailedLocation");
      } catch {}
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
    } catch {}
    userInitiatedRef.current = false;
    attemptedLocationRef.current = null;
    setLocationInput("");
    router.push(`/dmStats`);
  }, [router]);

  // If no locationId provided, show textbox (authenticated users only)

  // If a 404 occurs after a user-initiated update, clear the location query and
  // show a short message on the page (keeps user on the DM page with no stats).
  React.useEffect(() => {
    if (!error) return;
    const isNotFound = String(error?.message).includes("(404)");
    if (isNotFound && userInitiatedRef.current) {
      userInitiatedRef.current = false;
      // capture the attempted id (if available) so we can show it after clearing the URL
      const failed = attemptedLocationRef.current ?? locationInput ?? null;
      attemptedLocationRef.current = null;
      setLocationInput("");

      if (failed) {
        setFailedLocationId(failed);
        try {
          sessionStorage.setItem("dmStatsFailedLocation", failed);
        } catch {}
      } else {
        // fallback message when we don't have the id
        const msg =
          "No DM stats found for that location or you do not have access.";
        setLoadErrorMessage(msg);
        try {
          sessionStorage.setItem("dmStatsFailedLocation", "");
        } catch {}
      }

      router.replace(`/dmStats`);
    }
  }, [error, router]);

  // Clear transient load message when location-scoped data successfully loads.
  // Do NOT clear the message when *global* data refreshes after we replaced the URL —
  // that caused the message to vanish immediately for a bad location id.
  React.useEffect(() => {
    if (data && resolvedLocationId) {
      setLoadErrorMessage(null);
      setFailedLocationId(null);
      try {
        sessionStorage.removeItem("dmStatsFailedLocation");
      } catch {}
    }
  }, [data, resolvedLocationId]);
  if (!resolvedLocationId)
    return (
      <main>
        <h2 className="text-lg font-semibold">DM Chat Stats</h2>

        {!session ? (
          <p className="mt-4 text-sm text-muted-foreground">
            Sign in to view DM chat stats for a location.
          </p>
        ) : (
          <>
            <form
              className="mt-4 flex items-center gap-2"
              onSubmit={submitLocation}
            >
              <Input
                placeholder="Enter location id (channel/guild id)"
                value={locationInput}
                onChange={(e) => {
                  setLocationInput((e.target as HTMLInputElement).value);
                  setLoadErrorMessage(null);
                  setFailedLocationId(null);
                  try {
                    sessionStorage.removeItem("dmStatsFailedLocation");
                  } catch {}
                }}
                aria-label="location id"
              />
              <Button type="submit">Show stats</Button>
            </form>

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

  // Show page-level loader / error when trying to load a location's stats
  if (!data && isLoading)
    return (
      <p className="mt-4 text-sm text-muted-foreground">Loading DM stats…</p>
    );

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
              onChange={(e) => {
                setLocationInput((e.target as HTMLInputElement).value);
                setLoadErrorMessage(null);
                setFailedLocationId(null);
                try {
                  sessionStorage.removeItem("dmStatsFailedLocation");
                } catch {}
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

  if (!data)
    return <p className="mt-4 text-sm text-muted-foreground">No data</p>;

  const entries = Object.entries(data.totalsByAction) as Array<[string, any]>;

  return (
    <main>
      <div
        className={`flex flex-col gap-4 ${isLoading ? "opacity-80" : ""}`}
        aria-busy={isLoading}
      >
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3">
          <Card className="mx-auto w-full">
            <CardContent className="flex items-center gap-2">
              <Input
                value={locationInput}
                onChange={(e) => {
                  setLocationInput((e.target as HTMLInputElement).value);
                  setLoadErrorMessage(null);
                  setFailedLocationId(null);
                  try {
                    sessionStorage.removeItem("dmStatsFailedLocation");
                  } catch {}
                }}
              />
              <Button size="sm" onClick={submitLocation}>
                Update
              </Button>
              <Button size="sm" variant="ghost" onClick={clearLocation}>
                Clear
              </Button>

              {isLoading && (
                <span className="text-xs text-muted-foreground ml-2">
                  Refreshing…
                </span>
              )}
            </CardContent>
          </Card>

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
