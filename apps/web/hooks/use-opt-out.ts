import * as React from "react";

export function useOptOut() {
  const [optedOut, setOptedOut] = React.useState<boolean | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<Error | null>(null);

  const fetchStatus = React.useCallback(async (): Promise<boolean | null> => {
    setIsLoading(true);
    setError(null);
    try {
      const resp = await fetch("/api/optout");
      if (!resp.ok) {
        const text = await resp.text();
        throw new Error(`fetchStatus failed (${resp.status}): ${text}`);
      }
      const json = (await resp.json()) as { optedOut: boolean };
      setOptedOut(json.optedOut);
      return json.optedOut;
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const toggle = React.useCallback(async (): Promise<boolean | null> => {
    // If we don't know current state, fetch it first.
    let current = optedOut;
    if (current === null) {
      current = await fetchStatus();
      if (current === null) return null; // fetchStatus failed
    }
    const method = current ? "DELETE" : "POST";
    setIsLoading(true);
    setError(null);
    try {
      const resp = await fetch("/api/optout", { method });
      if (!resp.ok) {
        const text = await resp.text();
        throw new Error(`toggle failed (${resp.status}): ${text}`);
      }
      const newStatus = !current;
      setOptedOut(newStatus);
      return newStatus;
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
      return current;
    } finally {
      setIsLoading(false);
    }
  }, [optedOut, fetchStatus]);

  return { optedOut, isLoading, error, fetchStatus, toggle } as const;
}
