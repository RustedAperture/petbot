"use client";

import * as React from "react";

const INITIAL_RETRY_MS = 1000;
const MAX_RETRY_MS = 30_000;

type BotMembership = {
  /** `null` while unknown: loading, or the lookup failed and is being retried. */
  isBotMember: boolean | null;
  isLoading: boolean;
  error: Error | null;
};

/** Whether PetBot is in the guild right now; a failed lookup is unknown and retried with backoff. */
export function useBotMembership(guildId: string | null): BotMembership {
  const [state, setState] = React.useState<{
    guildId: string;
    isBotMember: boolean | null;
    error: Error | null;
  } | null>(null);

  React.useEffect(() => {
    if (!guildId) {
      return;
    }
    let isActive = true;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    let delayMs = INITIAL_RETRY_MS;
    const controller = new AbortController();

    const attempt = async () => {
      try {
        const res = await fetch(`/api/guilds/bot/${encodeURIComponent(guildId)}`, {
          cache: "no-store",
          signal: controller.signal,
        });
        if (!res.ok) {
          throw new Error(`Failed to fetch bot membership (${res.status})`);
        }
        const json = await res.json();
        if (isActive) {
          setState({ guildId, isBotMember: Boolean(json?.isBotMember), error: null });
        }
      } catch (err) {
        if (!isActive) {
          return;
        }
        setState({
          guildId,
          isBotMember: null,
          error: err instanceof Error ? err : new Error(String(err)),
        });
        retryTimer = setTimeout(() => void attempt(), delayMs);
        delayMs = Math.min(delayMs * 2, MAX_RETRY_MS);
      }
    };
    void attempt();

    return () => {
      isActive = false;
      controller.abort();
      if (retryTimer) {
        clearTimeout(retryTimer);
      }
    };
  }, [guildId]);

  if (!guildId) {
    return { isBotMember: false, isLoading: false, error: null };
  }
  if (state?.guildId !== guildId) {
    return { isBotMember: null, isLoading: true, error: null };
  }
  return {
    isBotMember: state.isBotMember,
    isLoading: state.isBotMember === null && state.error === null,
    error: state.error,
  };
}
