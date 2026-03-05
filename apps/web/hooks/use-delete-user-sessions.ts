import * as React from "react";

export function useDeleteUserSessions() {
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<Error | null>(null);

  const deleteUserSessions = React.useCallback(async (userId: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const resp = await fetch(
        `/api/userSessions?userId=${encodeURIComponent(userId)}`,
        {
          method: "DELETE",
        },
      );
      if (!resp.ok) {
        const text = await resp.text();
        throw new Error(`deleteUserSessions failed (${resp.status}): ${text}`);
      }
      return true;
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { deleteUserSessions, isLoading, error } as const;
}
