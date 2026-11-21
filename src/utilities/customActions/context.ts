import { getBotData } from "../../db/functions.js";
import type { ActionContext } from "./resolver.js";

export type ActionContextInput = {
  guildId: string | null;
  channelId: string | null;
  authorId: string;
  targetId?: string | null;
};

/** Builds the resolver context for any interaction type, loading the guild's restricted flag. */
export async function buildActionContextFor(
  input: ActionContextInput,
): Promise<ActionContext> {
  const { guildId } = input;
  const settings = guildId ? await getBotData(guildId) : null;
  return {
    guildId,
    locationId: guildId ?? input.channelId!,
    authorId: input.authorId,
    targetId: input.targetId ?? null,
    isRestricted: Boolean(settings?.restricted),
  };
}
