import type { ChatInputCommandInteraction } from "discord.js";
import { listCustomActions } from "../utilities/customActions/store.js";
import { executeNamedAction } from "./slash/action.js";

/** Runs a guild's native custom command; returns false when the guild has no action with that name. */
export async function executeCustomGuildCommand(
  interaction: ChatInputCommandInteraction,
): Promise<boolean> {
  if (!interaction.guildId) {
    return false;
  }
  const guildActions = await listCustomActions("guild", interaction.guildId);
  if (!guildActions.some((a) => a.name === interaction.commandName)) {
    return false;
  }
  await executeNamedAction(interaction, interaction.commandName);
  return true;
}
