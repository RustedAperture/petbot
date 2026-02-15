"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/hooks/use-session";
import { useBotGuilds } from "@/hooks/use-bot-guilds";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";

type Props = {
  value?: string | null;
  onChange?: (value: string) => void;
  size?: "sm" | "default";
  className?: string;
  placeholder?: string;
};

export default function GuildSelect({
  value = null,
  onChange,
  size = "default",
  className,
  placeholder = "Choose a guild",
}: Props) {
  const router = useRouter();
  const { session } = useSession();
  const { data: botGuildIds, isLoading: botGuildsLoading } = useBotGuilds(
    session?.user.id ?? null,
  );

  const availableGuilds = (session?.guilds ?? []).filter((g) =>
    (botGuildIds ?? []).includes(g.id),
  );

  const handleChange = React.useCallback(
    (v: string) => {
      if (onChange) return onChange(v);
      router.push(`/guildStats?guildId=${v}`);
    },
    [onChange, router],
  );

  return (
    <div className={className}>
      <div className="flex items-center gap-3">
        <label className="text-sm text-muted-foreground">Guild</label>

        {botGuildsLoading ? (
          <div className="text-sm text-muted-foreground">Loading guilds…</div>
        ) : session ? (
          availableGuilds.length > 0 ? (
            <Select onValueChange={handleChange} value={value ?? ""}>
              <SelectTrigger size={size}>
                <SelectValue>
                  {availableGuilds.find((g) => g.id === value)?.name ??
                    placeholder}
                </SelectValue>
              </SelectTrigger>

              <SelectContent>
                {availableGuilds.map((g) => (
                  <SelectItem key={g.id} value={g.id}>
                    {g.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <div className="text-sm text-muted-foreground">
              You don't share any guilds with the bot (or the bot has no data
              for your guilds).
            </div>
          )
        ) : (
          <div className="text-sm text-muted-foreground">
            Sign in to select a guild
          </div>
        )}
      </div>
    </div>
  );
}
