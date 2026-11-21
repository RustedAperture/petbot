import { getBotData } from "../../db/functions.js";
import type { Client } from "discord.js";
import type { ActionContext } from "./resolver.js";

export type ActionContextInput = {
  guildId: string | null;
  channelId: string | null;
  authorId: string;
  targetId?: string | null;
  /** The interaction's client; omit only where no Discord client exists (the guild is then assumed present). */
  client?: Client;
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
    isBotInGuild:
      !guildId || !input.client || input.client.guilds.cache.has(guildId),
  };
}
