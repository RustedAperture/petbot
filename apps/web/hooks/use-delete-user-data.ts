import * as React from "react";

export function useDeleteUserData() {
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<Error | null>(null);

  const deleteUserData = React.useCallback(async (userId: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const resp = await fetch(`/api/userData/${encodeURIComponent(userId)}`, {
        method: "DELETE",
      });
      if (!resp.ok) {
        const text = await resp.text();
        throw new Error(`deleteUserData failed (${resp.status}): ${text}`);
      }
      return true;
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { deleteUserData, isLoading, error } as const;
}
