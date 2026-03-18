import { MessageFlags, type ButtonInteraction, type Message } from "discord.js";
import { resetAction } from "../utilities/resetAction.js";

export const customIdPrefix = "reset-";

export async function handleResetButton(interaction: ButtonInteraction) {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const action = interaction.customId.slice(customIdPrefix.length);
  const msg = (await interaction.message) as Message;
  const row = msg.components?.[0] as { components?: any[] } | undefined;
  const msgDesc = row?.components?.[1]?.content ?? "";
  const lines = msgDesc.split("\n")?.[1] ?? "";

  const slotStr = lines.trim().split(":")?.[1]?.trim() ?? "";
  const mentionMatch = msgDesc.match(/<@([0-9]+)>/);
  const mention = mentionMatch ? mentionMatch[1] : "";
  const slotNumber = slotStr ? parseInt(slotStr) : NaN;

  if (mention && !isNaN(slotNumber)) {
    await resetAction(action as any, interaction, mention, slotNumber);
    await interaction.editReply({
      content: `<@${mention}> ${action} image has been reset`,
    });
  } else {
    await interaction.editReply({
      content: "Failed to parse mention or slot number.",
    });
  }
}
