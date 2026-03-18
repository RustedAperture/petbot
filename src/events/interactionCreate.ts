import {
  Events,
  MessageFlags,
  type Interaction,
  type ButtonInteraction,
  type Client,
} from "discord.js";

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
  if (!commands) {
    return undefined;
  }

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
      const { buttonHandlers } = await import("../buttons/index.js");
      const handler = buttonHandlers.find((h) =>
        h.matches(buttonInteraction.customId),
      );

      if (handler) {
        try {
          await handler.execute(buttonInteraction);
        } catch (err) {
          console.error(err);
          if (!buttonInteraction.replied && !buttonInteraction.deferred) {
            await buttonInteraction.reply({
              content: "There was an error while handling this button.",
              flags: MessageFlags.Ephemeral,
            });
          } else if (buttonInteraction.deferred) {
            await buttonInteraction.editReply({
              content: "There was an error while handling this button.",
            });
          }
        }
      }
    } else if (interaction.isModalSubmit()) {
      const modal = interaction;
      const custom = modal.customId || "";

      const { modalHandlers } = await import("../modals/index.js");
      const handler = modalHandlers.find((h) => h.matches(custom));

      if (handler) {
        try {
          await handler.execute(modal);
        } catch (err) {
          console.error(err);
          if (!modal.replied && !modal.deferred) {
            await modal.reply({
              content: "There was an error while handling this modal.",
              flags: MessageFlags.Ephemeral,
            });
          } else if (modal.deferred) {
            await modal.editReply({
              content: "There was an error while handling this modal.",
            });
          }
        }
      }
    }
  },
};

export default interactionCreate;
