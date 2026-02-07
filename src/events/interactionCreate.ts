import {
  Events,
  MessageFlags,
  type Interaction,
  type ButtonInteraction,
  type Client,
  type Message,
  type GuildMember,
  type User,
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
      const select = interaction;
      const custom = select.customId || "";

      if (custom.startsWith("perform-select:")) {
        await select.deferReply();

        const [, targetId] = custom.split(":");
        const action = select.values?.[0];
        const guild = select.guildId ?? select.channelId!;
        // Normalize author to a User-like object (ensure .id exists)
        let authorRaw = select.member ?? select.user;
        const author =
          authorRaw && (authorRaw as any).user
            ? (authorRaw as any).user
            : (authorRaw as any);

        try {
          // fetch target (try member first) and normalize types
          let target: GuildMember | User;
          if (select.guild) {
            try {
              target = (await select.guild.members.fetch(
                targetId,
              )) as GuildMember;
            } catch {
              // fallback to user
              target = (await select.client.users.fetch(targetId)) as User;
            }
          } else {
            target = (await select.client.users.fetch(targetId)) as User;
          }

          if (!action) {
            await select.editReply({ content: "No action selected." });
            return;
          }

          // defensive check: ensure ids exist
          if (!target || !(target as any).id) {
            await select.editReply({ content: "Failed to resolve target." });
            return;
          }
          if (!author || !(author as any).id) {
            await select.editReply({ content: "Failed to resolve actor." });
            return;
          }

          // validate action
          if (!(action in (await import("../types/constants.js")).ACTIONS)) {
            await select.editReply({ content: "Invalid action." });
            return;
          }

          const { checkUser } = await import("../utilities/check_user.js");
          const { performAction } =
            await import("../utilities/actionHelpers.js");

          // Ensure both target and author have action rows ready concurrently
          await Promise.all([
            checkUser(action as any, target, guild),
            checkUser(action as any, author, guild),
          ]);

          const container = await performAction(
            action as any,
            target,
            author,
            guild,
            { skipChecks: true },
          );

          await select.editReply({
            components: [container] as any,
            flags: MessageFlags.IsComponentsV2,
          });
        } catch (err) {
          console.error(err);
          await select.editReply({ content: "Failed to perform action." });
        }
      }
    } else if (interaction.isModalSubmit()) {
      const modal = interaction;
      const custom = modal.customId || "";
      if (custom.startsWith("perform-modal:")) {
        await modal.deferReply();
        let action: string | null = null;
        try {
          action = modal.fields.getStringSelectValues("action")[0];
        } catch {
          // not a text input modal
        }

        const [, targetId] = custom.split(":");
        const guild = modal.guildId ?? modal.channelId!;
        // Normalize author to a User-like object (ensure .id exists)
        let authorRaw = modal.member ?? modal.user;
        const author =
          authorRaw && (authorRaw as any).user
            ? (authorRaw as any).user
            : (authorRaw as any);

        try {
          // fetch target (try member first) and normalize types
          let target: GuildMember | User;
          if (modal.guild) {
            try {
              target = (await modal.guild.members.fetch(
                targetId,
              )) as GuildMember;
            } catch {
              // fallback to user
              target = (await modal.client.users.fetch(targetId)) as User;
            }
          } else {
            target = (await modal.client.users.fetch(targetId)) as User;
          }

          if (!action) {
            // attempt to read selection from raw modal data (label -> component pattern)
            const comp = (modal as any).data?.components?.[0]?.component;
            if (comp && Array.isArray(comp.values) && comp.values.length > 0) {
              action = comp.values[0];
            }
          }

          // defensive check: ensure ids exist
          if (!target || !(target as any).id) {
            await modal.editReply({ content: "Failed to resolve target." });
            return;
          }
          if (!author || !(author as any).id) {
            await modal.editReply({ content: "Failed to resolve actor." });
            return;
          }

          if (!action) {
            await modal.editReply({ content: "No action provided." });
            return;
          }

          // validate action
          if (!(action in (await import("../types/constants.js")).ACTIONS)) {
            await modal.editReply({ content: "Invalid action." });
            return;
          }

          const { checkUser } = await import("../utilities/check_user.js");
          const { performAction } =
            await import("../utilities/actionHelpers.js");

          // Ensure both target and author have action rows ready concurrently
          await Promise.all([
            checkUser(action as any, target, guild),
            checkUser(action as any, author, guild),
          ]);

          const container = await performAction(
            action as any,
            target,
            author,
            guild,
            { skipChecks: true },
          );

          await modal.editReply({
            components: [container] as any,
            flags: MessageFlags.IsComponentsV2,
          });
        } catch (err) {
          console.error(err);
          await modal.editReply({ content: "Failed to perform action." });
        }
      }
    }
  },
};

export default interactionCreate;
