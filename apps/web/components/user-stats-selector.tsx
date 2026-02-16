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

export default function UserStatsSelector() {
  const params = useSearchParams();
  const router = useRouter();
  const { session } = useSession();

  const queryUserId = params.get("userId") ?? null;
  const queryUserScope =
    params.get("guildId") ?? params.get("locationId") ?? "";

  const [userScopeInput, setUserScopeInput] = React.useState<string>(
    queryUserScope ?? "",
  );
  React.useEffect(
    () => setUserScopeInput(queryUserScope ?? ""),
    [queryUserScope],
  );

  const { data: botGuildIds, isLoading: botGuildsLoading } = useBotGuilds(
    session?.user.id ?? null,
  );

  const availableGuilds = (session?.guilds ?? []).filter((g) =>
    (botGuildIds ?? []).includes(g.id),
  );

  const submitUserScope = React.useCallback(
    (e?: React.FormEvent) => {
      e?.preventDefault();
      const trimmed = (userScopeInput ?? "").trim();
      const resolvedUserId = queryUserId ?? session?.user.id ?? null;
      if (!resolvedUserId) {
        return;
      }

      if (!trimmed) {
        router.push(
          `/userStats?userId=${encodeURIComponent(resolvedUserId)}&userScoped=true`,
        );
        return;
      }

      const isGuild = availableGuilds.some((g) => g.id === trimmed);
      if (isGuild) {
        router.push(
          `/userStats?userId=${encodeURIComponent(resolvedUserId)}&guildId=${encodeURIComponent(trimmed)}&userScoped=true`,
        );
      } else {
        router.push(
          `/userStats?userId=${encodeURIComponent(resolvedUserId)}&locationId=${encodeURIComponent(trimmed)}&userScoped=true`,
        );
      }
    },
    [userScopeInput, queryUserId, session, availableGuilds, router],
  );

  const handleUserScopeSelect = React.useCallback(
    (val: string | null) => {
      const resolvedUserId = queryUserId ?? session?.user.id ?? null;
      if (!resolvedUserId) {
        return;
      }
      setUserScopeInput(val ?? "");
      if (!val) {
        router.push(
          `/userStats?userId=${encodeURIComponent(resolvedUserId)}&userScoped=true`,
        );
        return;
      }
      const isGuild = availableGuilds.some((g) => g.id === val);
      if (isGuild) {
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
          onInput={(e: React.FormEvent<HTMLInputElement>) =>
            setUserScopeInput((e.target as HTMLInputElement).value)
          }
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
