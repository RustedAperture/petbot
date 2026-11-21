import type { ActionTotals } from "@/types/stats";

const VALID_URL = /^https?:\/\//i;

type GuildLike = { id: string; name: string };

/** Servers from the session where the user has PetBot data, sorted by name. */
export function placeOptions(
  sessionGuilds: GuildLike[],
  locationIds: string[],
): GuildLike[] {
  const known = new Set(locationIds);
  return sessionGuilds
    .filter((g) => known.has(g.id))
    .map((g) => ({ id: g.id, name: g.name }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * The images to show as the user's own. The stats API fills an unset action
 * with just its default image, which counts as unset, except on an action the
 * user created, where its image counts as their first. Saved arrays are kept whole.
 */
export function ownImages(totals: ActionTotals, isCreator = false): string[] {
  const valid = (totals.images ?? []).filter((url) => VALID_URL.test(url));
  if (isCreator) {
    return valid.length === 0 && totals.imageUrl ? [totals.imageUrl] : valid;
  }
  const isUnsetFill = valid.length === 1 && valid[0] === totals.imageUrl;
  return isUnsetFill ? [] : valid;
}

/** Splits stats entries into built-ins plus the user's own custom actions, and everyone else's. */
export function splitOwnActions<T>(
  entries: Array<[string, T]>,
  builtInNames: readonly string[],
  ownNames: ReadonlySet<string>,
): { mine: Array<[string, T]>; others: Array<[string, T]> } {
  const mine: Array<[string, T]> = [];
  const others: Array<[string, T]> = [];
  for (const entry of entries) {
    const isMine = builtInNames.includes(entry[0]) || ownNames.has(entry[0]);
    (isMine ? mine : others).push(entry);
  }
  return { mine, others };
}
