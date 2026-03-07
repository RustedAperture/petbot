import { GuildMember, User } from "discord.js";

// Returns de-duplicated targets keyed by user id.  Every result is an
// object containing a `user` property and an optional `member` (if the
// original input was a GuildMember).  Consumers can ignore the member
// field when not needed.
export function collectUniqueUsers(
  ...targets: Array<GuildMember | User | null | undefined>
): Array<{ user: User; member?: GuildMember }> {
  const seen = new Set<string>();
  const result: Array<{ user: User; member?: GuildMember }> = [];

  for (const t of targets) {
    if (!t) {
      continue;
    }
    const id: string = (t as any).user?.id ?? (t as any).id;
    if (seen.has(id)) {
      continue;
    }
    seen.add(id);

    if (t instanceof GuildMember) {
      result.push({ user: t.user, member: t });
    } else {
      result.push({ user: t, member: undefined });
    }
  }

  return result;
}
