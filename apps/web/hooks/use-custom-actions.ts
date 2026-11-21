import { useCallback } from "react";
import useSWR from "swr";
import type {
  CustomAction,
  CustomActionInput,
  CustomActionsScope,
} from "@/types/custom-actions";

const FALLBACK_ERROR = "Something went wrong. Please try again.";

async function errorMessage(res: Response): Promise<string> {
  const json = await res.json().catch(() => null);
  return typeof json?.error === "string" ? json.error : FALLBACK_ERROR;
}

const fetcher = async (url: string): Promise<{ actions: CustomAction[] }> => {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(await errorMessage(res));
  }
  return res.json();
};

function endpointFor(scope: CustomActionsScope): string {
  return scope.kind === "user"
    ? `/api/customActions/user/${encodeURIComponent(scope.userId)}`
    : `/api/customActions/guild/${encodeURIComponent(scope.guildId)}`;
}

export function useCustomActions(scope: CustomActionsScope) {
  const endpoint = endpointFor(scope);
  const { data, error, isLoading, mutate } = useSWR(endpoint, fetcher);

  /** Sends a write and resolves to the API's error message, or null on success. */
  const write = useCallback(
    async (url: string, init: RequestInit): Promise<string | null> => {
      let res: Response;
      try {
        res = await fetch(url, init);
      } catch {
        return FALLBACK_ERROR;
      }
      if (!res.ok) {
        return errorMessage(res);
      }
      await mutate();
      return null;
    },
    [mutate],
  );

  const save = useCallback(
    (input: CustomActionInput) =>
      write(endpoint, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      }),
    [endpoint, write],
  );

  const remove = useCallback(
    (name: string) =>
      write(`${endpoint}/${encodeURIComponent(name)}`, { method: "DELETE" }),
    [endpoint, write],
  );

  return {
    actions: data?.actions ?? [],
    isLoading,
    error: error ?? null,
    save,
    remove,
  };
}
