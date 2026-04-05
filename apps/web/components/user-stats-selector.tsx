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

type GuildItem = { label: string; value: string };

// helper used by the component and exported for testing.  Given a raw
// scope value (guild id or location id) and the list of guilds the session
// knows about, return the text that should be shown to the user.
export function getScopeDisplay(
  value: string,
  availableGuilds: GuildItem[],
): string {
  const guild = availableGuilds.find((g) => g.value === value);
  return guild ? guild.label : value;
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
  // Prepend a "Global" option so it appears first in the combobox.
  const availableGuilds = React.useMemo(
    () => [
      { label: "Global", value: "" } as GuildItem,
      ...(session?.guilds ?? [])
        .filter((g) => (botGuildIds ?? []).includes(g.id))
        .map((g) => ({ label: g.name, value: g.id })),
    ],
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
      const isGuild = availableGuilds.some((g) => g.value === valueToUse);
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
    (item: GuildItem | null) => {
      const resolvedUserId = queryUserId ?? session?.user.id ?? null;
      if (!resolvedUserId) {
        return;
      }

      if (!item) {
        setUserScopeValue(null);
        setUserScopeInput("");
        router.push(
          `/userStats?userId=${encodeURIComponent(resolvedUserId)}&userScoped=true`,
        );
        return;
      }

      setUserScopeValue(item.value);
      setUserScopeInput(item.label);

      router.push(
        `/userStats?userId=${encodeURIComponent(resolvedUserId)}&guildId=${encodeURIComponent(item.value)}&userScoped=true`,
      );
    },
    [queryUserId, session, router],
  );

  // Render — single freeform Combobox (accepts typed location id OR select a guild/global)
  return (
    <form className="flex items-center gap-4" onSubmit={submitUserScope}>
      <Combobox
        items={availableGuilds}
        onValueChange={handleUserScopeSelect}
        itemToStringValue={(guild: GuildItem) => guild.label}
      >
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
            {availableGuilds.map((guild) => (
              <ComboboxItem key={guild.value} value={guild}>
                {guild.label}
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
