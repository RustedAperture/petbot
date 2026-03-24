import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function isAdminOrOwnerGuild(guild: {
  owner?: boolean;
  permissions?: string | null;
}) {
  if (guild.owner) {
    return true;
  }
  if (!guild.permissions) {
    return false;
  }

  try {
    const perms = BigInt(guild.permissions);
    const ADMIN_FLAG = BigInt(8);
    return (perms & ADMIN_FLAG) !== BigInt(0);
  } catch {
    return false;
  }
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
