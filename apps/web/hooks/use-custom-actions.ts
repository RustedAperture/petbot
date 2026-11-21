import { useCallback } from "react";
import useSWR from "swr";
import type {
  CustomAction,
  CustomActionInput,
  CustomActionsScope,
} from "@/types/custom-actions";

const FALLBACK_ERROR = "Something went wrong. Please try again.";

const fetcher = async (url: string): Promise<{ actions: CustomAction[] }> => {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to load custom actions (${res.status})`);
  }
  return res.json();
};

function endpointFor(scope: CustomActionsScope): string {
  return scope.kind === "user"
    ? `/api/customActions/user/${encodeURIComponent(scope.userId)}`
    : `/api/customActions/guild/${encodeURIComponent(scope.guildId)}`;
}

async function errorMessage(res: Response): Promise<string> {
  const json = await res.json().catch(() => null);
  return typeof json?.error === "string" ? json.error : FALLBACK_ERROR;
}

export function useCustomActions(scope: CustomActionsScope) {
  const endpoint = endpointFor(scope);
  const { data, error, isLoading, mutate } = useSWR(endpoint, fetcher);

  /** Resolves to the API's error message, or null on success. */
  const save = useCallback(
    async (input: CustomActionInput): Promise<string | null> => {
      let res: Response;
      try {
        res = await fetch(endpoint, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        });
      } catch {
        return FALLBACK_ERROR;
      }
      if (!res.ok) {
        return errorMessage(res);
      }
      await mutate();
      return null;
    },
    [endpoint, mutate],
  );

  const remove = useCallback(
    async (name: string): Promise<void> => {
      await fetch(`${endpoint}/${encodeURIComponent(name)}`, {
        method: "DELETE",
      });
      await mutate();
    },
    [endpoint, mutate],
  );

  return {
    actions: data?.actions ?? [],
    isLoading,
    error: error ?? null,
    save,
    remove,
  };
}
