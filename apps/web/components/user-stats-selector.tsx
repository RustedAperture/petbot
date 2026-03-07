"use client";

import * as React from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Combobox,
  ComboboxInput,
  ComboboxContent,
  ComboboxList,
  ComboboxItem,
} from "@/components/ui/combobox";
import { Button } from "@/components/ui/button";
import { useSession } from "@/hooks/use-session";
import { useBotGuilds } from "@/hooks/use-bot-guilds";

// helper used by the component and exported for testing.  Given a raw
// scope value (guild id or location id) and the list of guilds the session
// knows about, return the text that should be shown to the user.
export function getScopeDisplay(
  value: string,
  availableGuilds: Array<{ id: string; name: string }>,
): string {
  const guild = availableGuilds.find((g) => g.id === value);
  return guild ? guild.name : value;
}

export default function UserStatsSelector() {
  const params = useSearchParams();
  const router = useRouter();
  const { session, refresh } = useSession();

  const queryUserId = params.get("userId") ?? null;
  const queryUserScope =
    params.get("guildId") ?? params.get("locationId") ?? "";

  // text shown in the input; may be a guild name while the underlying
  // value is still the id.  We keep the raw value separately so we can build
  // routes correctly.
  const [userScopeInput, setUserScopeInput] = React.useState<string>(
    queryUserScope ?? "",
  );
  const [userScopeValue, setUserScopeValue] = React.useState<string | null>(
    queryUserScope || null,
  );

  // (effect relocated below after availableGuilds definition)

  const { data: botGuildIds, isLoading: botGuildsLoading } = useBotGuilds(
    session?.user.id ?? null,
  );

  // Memoize the filtered list so downstream hooks don't fire on every render.
  const availableGuilds = React.useMemo(
    () =>
      (session?.guilds ?? []).filter((g) => (botGuildIds ?? []).includes(g.id)),
    [session?.guilds, botGuildIds],
  );

  // sync state with query params & available guilds; convert id->name for the
  // display when appropriate.  This has to live after availableGuilds is
  // defined otherwise we'd reference it too early.
  React.useEffect(() => {
    const val = queryUserScope ?? "";
    setUserScopeValue(val || null);
    setUserScopeInput(getScopeDisplay(val, availableGuilds));
  }, [queryUserScope, availableGuilds]); // availableGuilds is memoized above

  // If session reports no guilds but the bot has guild data, try a forced
  // session refresh once so localStorage gets renewed.
  const _triedSessionRefresh = React.useRef(false);
  React.useEffect(() => {
    if (
      !_triedSessionRefresh.current &&
      session &&
      (session.guilds ?? []).length === 0 &&
      !botGuildsLoading &&
      (botGuildIds ?? []).length > 0
    ) {
      _triedSessionRefresh.current = true;
      void refresh(true);
    }
  }, [session, botGuildIds, botGuildsLoading, refresh]);

  const submitUserScope = React.useCallback(
    (e?: React.FormEvent) => {
      e?.preventDefault();
      const trimmedInput = (userScopeInput ?? "").trim();
      const resolvedUserId = queryUserId ?? session?.user.id ?? null;
      if (!resolvedUserId) {
        return;
      }

      if (!trimmedInput) {
        router.push(
          `/userStats?userId=${encodeURIComponent(resolvedUserId)}&userScoped=true`,
        );
        return;
      }

      // use the explicit selected value when available else fall back to
      // whatever the user typed
      const valueToUse = userScopeValue ?? trimmedInput;
      const isGuild = availableGuilds.some((g) => g.id === valueToUse);
      if (isGuild) {
        router.push(
          `/userStats?userId=${encodeURIComponent(resolvedUserId)}&guildId=${encodeURIComponent(valueToUse)}&userScoped=true`,
        );
      } else {
        router.push(
          `/userStats?userId=${encodeURIComponent(resolvedUserId)}&locationId=${encodeURIComponent(valueToUse)}&userScoped=true`,
        );
      }
    },
    [
      userScopeInput,
      userScopeValue,
      queryUserId,
      session,
      availableGuilds,
      router,
    ],
  );

  const handleUserScopeSelect = React.useCallback(
    (val: string | null) => {
      const resolvedUserId = queryUserId ?? session?.user.id ?? null;
      if (!resolvedUserId) {
        return;
      }

      if (!val) {
        setUserScopeValue(null);
        setUserScopeInput("");
        router.push(
          `/userStats?userId=${encodeURIComponent(resolvedUserId)}&userScoped=true`,
        );
        return;
      }

      const guild = availableGuilds.find((g) => g.id === val);
      const display = guild ? guild.name : val;
      setUserScopeValue(val);
      setUserScopeInput(display);

      if (guild) {
        router.push(
          `/userStats?userId=${encodeURIComponent(resolvedUserId)}&guildId=${encodeURIComponent(val)}&userScoped=true`,
        );
      } else {
        router.push(
          `/userStats?userId=${encodeURIComponent(resolvedUserId)}&locationId=${encodeURIComponent(val)}&userScoped=true`,
        );
      }
    },
    [queryUserId, session, availableGuilds, router],
  );

  // Render — single freeform Combobox (accepts typed location id OR select a guild/global)
  return (
    <form className="flex items-center gap-4" onSubmit={submitUserScope}>
      <Combobox onValueChange={handleUserScopeSelect}>
        <ComboboxInput
          placeholder="Global / guild / location id"
          aria-label="user stats scope"
          value={userScopeInput}
          onInput={(e: React.FormEvent<HTMLInputElement>) => {
            setUserScopeInput((e.target as HTMLInputElement).value);
            setUserScopeValue(null);
          }}
          showClear
          className="min-w-[8rem] md:min-w-[12rem]"
        />

        <ComboboxContent>
          <ComboboxList>
            <ComboboxItem value="">Global</ComboboxItem>
            {!botGuildsLoading &&
              availableGuilds.map((g) => (
                <ComboboxItem key={g.id} value={g.id}>
                  {g.name}
                </ComboboxItem>
              ))}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>

      <Button size="sm" type="submit">
        Go
      </Button>
    </form>
  );
}
