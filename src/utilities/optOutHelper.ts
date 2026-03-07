import { User, MessageFlags } from "discord.js";
import { isOptedOut } from "./check_user.js";

const ALL_OPTED_MSG =
  "The target user(s) have opted out of PetBot and cannot be interacted with.";

/**
 * Given an array of candidate users (possibly containing duplicates or nulls),
 * determine which ones have opted out and reply/return appropriate values.
 *
 * The method deduplicates by user ID before hitting the database, then
 * performs a parallel `isOptedOut` check.  It will automatically send an
 * ephemeral reply and return `allOptedOut:true` if every unique user is
 * opted out.
 */
export async function checkOptOuts(
  interaction: any,
  users: Array<User | null | undefined>,
): Promise<{ optedOutIds: Set<string>; allOptedOut: boolean }> {
  const unique = [
    ...new Map(
      users.filter((u): u is User => u != null).map((u) => [u.id, u]),
    ).values(),
  ];

  const results = await Promise.all(unique.map((u) => isOptedOut(u.id)));
  const optedOutIds = new Set(
    unique.filter((_, i) => results[i]).map((u) => u.id),
  );

  const allOptedOut = optedOutIds.size === unique.length && unique.length > 0;
  if (allOptedOut) {
    await interaction.reply({
      content: ALL_OPTED_MSG,
      flags: MessageFlags.Ephemeral,
    });
  }

  return { optedOutIds, allOptedOut };
}
