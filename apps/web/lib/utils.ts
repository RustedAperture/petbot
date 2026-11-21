import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type GuildPermissions = {
  owner?: boolean;
  permissions?: string | null;
};

const ADMINISTRATOR_FLAG = BigInt(8);
const MANAGE_GUILD_FLAG = BigInt(32);

function hasPermissionFlag(guild: GuildPermissions, flag: bigint): boolean {
  if (!guild.permissions) {
    return false;
  }
  try {
    return (BigInt(guild.permissions) & flag) !== BigInt(0);
  } catch {
    return false;
  }
}

/** Owner, Administrator or Manage Server: may manage the server's settings and custom actions. */
export function canManageServerGuild(guild: GuildPermissions) {
  return (
    Boolean(guild.owner) ||
    hasPermissionFlag(guild, ADMINISTRATOR_FLAG) ||
    hasPermissionFlag(guild, MANAGE_GUILD_FLAG)
  );
}

export function getDiscordGuildIconUrl(
  guildId: string,
  iconHash?: string | null,
): string | null {
  if (!guildId || !iconHash) {
    return null;
  }

  const isAnimated = iconHash.startsWith("a_");
  const ext = isAnimated ? "gif" : "png";
  return `https://cdn.discordapp.com/icons/${encodeURIComponent(
    guildId,
  )}/${encodeURIComponent(iconHash)}.${ext}?size=64`;
}
