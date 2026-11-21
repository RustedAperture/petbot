import type { ChatInputCommandInteraction } from "discord.js";
import { listCustomActions } from "../utilities/customActions/store.js";
import { resolveAction } from "../utilities/customActions/resolver.js";
import { buildActionContext } from "./actionAutocomplete.js";
import { executeResolvedAction, replyUnavailable } from "./slash/action.js";

/** Runs a guild's native custom command; defers before any lookup, so it answers every guild interaction itself and returns false only outside a guild. */
export async function executeCustomGuildCommand(
  interaction: ChatInputCommandInteraction,
): Promise<boolean> {
  if (!interaction.guildId) {
    return false;
  }
  await interaction.deferReply();
  const guildActions = await listCustomActions("guild", interaction.guildId);
  if (!guildActions.some((a) => a.name === interaction.commandName)) {
    await replyUnavailable(interaction);
    return true;
  }
  const ctx = await buildActionContext(interaction);
  const action = await resolveAction(interaction.commandName, ctx);
  if (!action?.sources.includes("guild")) {
    await replyUnavailable(interaction);
    return true;
  }
  await executeResolvedAction(interaction, action, ctx);
  return true;
}
