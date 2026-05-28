import * as React from "react";

export function useLeaderboardConsent() {
  const [enabled, setEnabled] = React.useState<boolean | null>(null);
  const [displayName, setDisplayName] = React.useState<string | null>(null);
  const [hashLabel, setHashLabel] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<Error | null>(null);

  const fetchStatus = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const resp = await fetch("/api/leaderboard-consent");
      if (!resp.ok) {
        const text = await resp.text();
        throw new Error(`fetchStatus failed (${resp.status}): ${text}`);
      }
      const json = (await resp.json()) as {
        enabled: boolean;
        displayName: string | null;
        hashLabel: string;
      };
      setEnabled(json.enabled);
      setDisplayName(json.displayName);
      setHashLabel(json.hashLabel);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setIsLoading(false);
    }
  }, []);

  const update = React.useCallback(async (name: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const resp = await fetch("/api/leaderboard-consent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName: name }),
      });
      if (!resp.ok) {
        const text = await resp.text();
        throw new Error(`update failed (${resp.status}): ${text}`);
      }
      setEnabled(true);
      setDisplayName(name);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const disable = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const resp = await fetch("/api/leaderboard-consent", { method: "DELETE" });
      if (!resp.ok) {
        const text = await resp.text();
        throw new Error(`disable failed (${resp.status}): ${text}`);
      }
      setEnabled(false);
      setDisplayName(null);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { enabled, displayName, hashLabel, isLoading, error, fetchStatus, update, disable } as const;
}
