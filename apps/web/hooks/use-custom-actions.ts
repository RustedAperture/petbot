import { useCallback, useEffect, useState } from "react";
import useSWR, { mutate } from "swr";
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

const fetcher = async (
  url: string,
): Promise<{
  actions: CustomAction[];
  isBanned?: boolean;
  banReason?: string | null;
}> => {
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
    /** Only personal lists report this; a server list leaves it false. */
    isBanned: data?.isBanned === true,
    banReason: data?.banReason ?? null,
    isLoading,
    error: error ?? null,
    save,
    remove,
  };
}

const NAME_PATTERN = /^[a-z]{1,20}$/;
const PHRASE_LOOKUP_DELAY_MS = 300;

const phraseFetcher = async (
  url: string,
): Promise<{ phrase: string | null }> => {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(await errorMessage(res));
  }
  return res.json();
};

/** The phrase existing actions with this name use, once typing pauses; null when unused. */
export function useCommonPhrase(name: string): string | null {
  const [lookupName, setLookupName] = useState("");
  useEffect(() => {
    const timer = setTimeout(
      () => setLookupName(NAME_PATTERN.test(name) ? name : ""),
      PHRASE_LOOKUP_DELAY_MS,
    );
    return () => clearTimeout(timer);
  }, [name]);
  const phrase = usePhraseFor(lookupName);
  return lookupName === name ? phrase : null;
}

// Live updates re-render the stats page often; fetch each name once per page load.
const preloadedPhraseKeys = new Set<string>();

const phraseKey = (name: string) =>
  NAME_PATTERN.test(name) ? `/api/customActions/phrase/${name}` : null;

/** The phrase existing actions with this name use, looked up straight away; null when unused or unknown yet. */
export function usePhraseFor(name: string): string | null {
  const { data } = useSWR(phraseKey(name), phraseFetcher);
  return data?.phrase ?? null;
}

/** Puts a name's phrase in the cache ahead of time so `usePhraseFor` has it on first render. */
export function preloadPhrase(name: string): void {
  const key = phraseKey(name);
  if (!key || preloadedPhraseKeys.has(key)) {
    return;
  }
  preloadedPhraseKeys.add(key);
  mutate(key, phraseFetcher(key), { revalidate: false }).catch(() =>
    preloadedPhraseKeys.delete(key),
  );
}
