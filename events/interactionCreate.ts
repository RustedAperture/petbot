import {
  Events,
  MessageFlags,
  type Interaction,
  type ButtonInteraction,
  type Client,
  type Message,
} from "discord.js";
import { resetAction } from "../utilities/resetAction.js";

interface Executable {
  name: string;
  execute: (interaction: Interaction) => Promise<void>;
  aliases?: string[];
}

type ClientWithCommands = Client & {
  slashCommands?: Map<string, Executable>;
  contextCommands?: Map<string, Executable>;
};

function findCommandByAlias(
  commands: Map<string, Executable> | undefined,
  alias: string,
): Executable | undefined {
  if (!commands) return undefined;

  for (const command of commands.values()) {
    if (command.aliases && command.aliases.includes(alias)) {
      return command;
    }
  }
  return undefined;
}

const interactionCreate = {
  name: Events.InteractionCreate,
  async execute(interaction: Interaction): Promise<void> {
    if (
      interaction.isChatInputCommand() ||
      interaction.isUserContextMenuCommand() ||
      interaction.isMessageContextMenuCommand()
    ) {
      let command: Executable | undefined;
      const client = interaction.client as ClientWithCommands;

      if (interaction.isChatInputCommand()) {
        command = client.slashCommands?.get(interaction.commandName);

        if (!command) {
          command = findCommandByAlias(
            client.slashCommands,
            interaction.commandName,
          );
        }
      } else if (interaction.isUserContextMenuCommand()) {
        command = client.contextCommands?.get(interaction.commandName);

        if (!command) {
          command = findCommandByAlias(
            client.contextCommands,
            interaction.commandName,
          );
        }
      }

      if (!command) {
        console.error(
          `No command matching ${interaction.commandName} was found.`,
        );
        return;
      }

      try {
        await command.execute(interaction);
      } catch (error) {
        console.error(error);
        if (!interaction.replied && !interaction.deferred) {
          try {
            await interaction.reply({
              content: "There was an error while executing this command!",
              flags: MessageFlags.Ephemeral,
            });
          } catch (replyError) {
            console.error("Failed to send error reply:", replyError);
          }
        } else if (interaction.deferred) {
          try {
            await interaction.editReply({
              content: "There was an error while executing this command!",
            });
          } catch (editError) {
            console.error("Failed to edit error reply:", editError);
          }
        }
      }
    } else if (interaction.isButton()) {
      const buttonInteraction = interaction as ButtonInteraction;

      if (buttonInteraction.customId === "reset-pet") {
        await buttonInteraction.deferReply({ flags: MessageFlags.Ephemeral });
        const msg = (await buttonInteraction.message) as Message;
        const row = msg.components?.[0] as { components?: any[] } | undefined;
        const msgDesc = row?.components?.[1]?.content ?? "";
        const lines = msgDesc.split("\n")?.[1] ?? "";
        const slotStr = lines.trim().split(":")?.[1]?.trim() ?? "";
        const mentionMatch = msgDesc.match(/<@(\d+)>/);
        const mention = mentionMatch ? mentionMatch[1] : "";
        const slotNumber = slotStr ? parseInt(slotStr) : NaN;

        if (mention && !isNaN(slotNumber)) {
          await resetAction("pet", buttonInteraction, mention, slotNumber);
          await buttonInteraction.editReply({
            content: `<@${mention}> pet image has been reset`,
          });
        } else {
          await buttonInteraction.editReply({
            content: "Failed to parse mention or slot number.",
          });
        }
      }
      if (buttonInteraction.customId === "reset-bite") {
        await buttonInteraction.deferReply({ flags: MessageFlags.Ephemeral });
        const msg = (await buttonInteraction.message) as Message;

        const row = msg.components?.[0] as { components?: any[] } | undefined;
        const msgDesc = row?.components?.[1]?.content ?? "";

        const lines = msgDesc.split("\n")?.[1] ?? "";

        const slotStr = lines.trim().split(":")?.[1]?.trim() ?? "";
        const mentionMatch = msgDesc.match(/<@(\d+)>/);
        const mention = mentionMatch ? mentionMatch[1] : "";
        const slotNumber = slotStr ? parseInt(slotStr) : NaN;

        if (mention && !isNaN(slotNumber)) {
          await resetAction("bite", buttonInteraction, mention, slotNumber);
          await buttonInteraction.editReply({
            content: `<@${mention}> bite image has been reset`,
          });
        } else {
          await buttonInteraction.editReply({
            content: "Failed to parse mention or slot number.",
          });
        }
      }
    } else if (interaction.isStringSelectMenu()) {
    }
  },
};

export default interactionCreate;
