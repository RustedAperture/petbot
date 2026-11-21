"use client";

import * as React from "react";

type BotMembership = { isBotMember: boolean; isLoading: boolean };

/** Whether PetBot is in the guild right now; a failed lookup counts as not a member. */
export function useBotMembership(guildId: string | null): BotMembership {
  const [state, setState] = React.useState<{
    guildId: string;
    isBotMember: boolean;
  } | null>(null);

  React.useEffect(() => {
    if (!guildId) {
      return;
    }
    const controller = new AbortController();
    const setResult = (isBotMember: boolean) =>
      setState({ guildId, isBotMember });
    fetch(`/api/guilds/bot/${encodeURIComponent(guildId)}`, {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (res) => {
        const json = res.ok ? await res.json() : null;
        setResult(Boolean(json?.isBotMember));
      })
      .catch((err) => {
        if (err?.name !== "AbortError") {
          setResult(false);
        }
      });
    return () => controller.abort();
  }, [guildId]);

  if (!guildId) {
    return { isBotMember: false, isLoading: false };
  }
  if (state?.guildId !== guildId) {
    return { isBotMember: false, isLoading: true };
  }
  return { isBotMember: state.isBotMember, isLoading: false };
}
