"use client";

import * as React from "react";
import { usePathname, useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { STATS_MENU } from "@/types/menu-config";
import GuildSelect from "@/components/guild-select";
import UserStatsSelector from "@/components/user-stats-selector";
import { useSession } from "@/hooks/use-session";
import { Github } from "lucide-react";

export function AppHeader() {
  const pathname = usePathname();
  const params = useSearchParams();
  const router = useRouter();
  const { session } = useSession();

  const active = STATS_MENU.find(
    (m) => m.href === pathname || pathname.startsWith(m.href + "/"),
  );
  const title = active?.title ?? "PetBot";
  const queryGuildId = params.get("guildId") ?? null;
  const queryLocationId =
    params.get("locationId") ?? params.get("guildId") ?? "";

  const [dmInput, setDmInput] = React.useState<string>(queryLocationId ?? "");
  React.useEffect(() => setDmInput(queryLocationId ?? ""), [queryLocationId]);

  const submitDm = React.useCallback(
    (e?: React.FormEvent) => {
      e?.preventDefault();
      const trimmed = dmInput?.trim();
      if (!trimmed) {
        return;
      }
      try {
        sessionStorage.removeItem("dmStatsFailedLocation");
      } catch {
        /* noop */
      }
      router.push(`/dmStats?locationId=${encodeURIComponent(trimmed)}`);
    },
    [dmInput, router],
  );

  const _clearDm = React.useCallback(() => {
    setDmInput("");
    try {
      sessionStorage.removeItem("dmStatsFailedLocation");
    } catch {
      /* noop */
    }
    router.push("/dmStats");
  }, [router]);

  return (
    <header className="flex h-16 shrink-0 items-center gap-4 px-4">
      <div className="flex items-center gap-4 w-full">
        <SidebarTrigger />
        <Separator
          orientation="vertical"
          className="data-[orientation=vertical]:h-4"
        />
        <h1 className="text-base font-medium">{title}</h1>

        {active?.href === "/guildStats" && (
          <GuildSelect
            value={queryGuildId}
            size="sm"
            className="min-w-[8rem] md:min-w-[12rem]"
          />
        )}

        {active?.href === "/dmStats" && session && (
          <form className="flex items-center gap-4" onSubmit={submitDm}>
            <Input
              placeholder="location id"
              aria-label="dm location id"
              value={dmInput}
              onChange={(e) => setDmInput((e.target as HTMLInputElement).value)}
              className="flex-1 min-w-0 sm:flex-none sm:min-w-[12rem]"
            />
            <Button size="sm" type="submit">
              {queryLocationId ? "Change" : "Show"}
            </Button>
          </form>
        )}

        {active?.href === "/userStats" && <UserStatsSelector />}
      </div>

      {/* right group */}
      <div className="hidden ml-auto md:flex items-center gap-2">
        <Button variant="outline" asChild size="sm" className="hidden sm:flex">
          <a
            href="https://github.com/RustedAperture/petbot"
            rel="noopener noreferrer"
            target="_blank"
            className="dark:text-foreground"
          >
            <Github /> GitHub
          </a>
        </Button>
      </div>
    </header>
  );
}
