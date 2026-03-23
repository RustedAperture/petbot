import {
  SlashCommandBuilder,
  PermissionsBitField,
  EmbedBuilder,
  MessageFlags,
} from "discord.js";
import logger from "../../logger.js";
import { ACTIONS } from "../../types/constants.js";
import { GuildSettings } from "../../types/guild.js";
import { getBotData, upsertBotData } from "../../db/functions.js";

export const command = {
  data: new SlashCommandBuilder()
    .setName("server-set")
    .setDescription("Sets the default images for this server")
    .addStringOption((option) =>
      option
        .setName("action")
        .setDescription("The action for which you want to update the image")
        .setRequired(true)
        .addChoices(
          ...(Object.keys(ACTIONS).map((k) => ({ name: k, value: k })) as any),
        ),
    )
    .addStringOption((option) =>
      option
        .setName("url")
        .setDescription("The url of the image that you would like to use")
        .setRequired(true),
    )
    .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator),
  async execute(interaction: any) {
    const action = interaction.options.getString("action");
    const url = interaction.options.getString("url");

    if (!action || !url) {
      return interaction.reply({
        content: "Both action and url are required.",
        flags: MessageFlags.Ephemeral,
      });
    }

    const actionConfig = ACTIONS[action as keyof typeof ACTIONS];
    if (!actionConfig) {
      return interaction.reply({
        content: `Unknown action: ${action}`,
        flags: MessageFlags.Ephemeral,
      });
    }

    const guildId = interaction.guildId;
    if (!guildId) {
      return interaction.reply({
        content: "This command can only be run in a server.",
        flags: MessageFlags.Ephemeral,
      });
    }

    let guildSettings = (await getBotData(guildId)) as GuildSettings | null;

    const setupEmbed = new EmbedBuilder().setTitle(
      "PetBot Server Config Updated",
    );

    if (!guildSettings) {
      guildSettings = await upsertBotData(guildId, {
        logChannel: "",
        nickname: "",
        sleepImage: "",
        defaultImages: null,
        restricted: false,
      });
    }

    const logChannelId = guildSettings.logChannel;
    let logChannel: any | null = null;

    if (logChannelId) {
      try {
        logChannel = await interaction.guild.channels.fetch(
          logChannelId as any,
        );
      } catch {
        logger.warn("No log channel has been setup yet!");
      }
    }

    // merge into the JSON map so future lookups prefer `defaultImages`
    const current = guildSettings.defaultImages as any;
    const map =
      current && typeof current === "object"
        ? { ...current }
        : current
          ? JSON.parse(current)
          : {};
    map[action] = url;

    await upsertBotData(guildId, {
      defaultImages: map,
    });

    logger.debug(
      `Updated default ${actionConfig.noun} image for guild: ${interaction.guildId}`,
    );
    setupEmbed
      .setThumbnail(url)
      .addFields({
        name: `${actionConfig.noun[0].toUpperCase()}${actionConfig.noun.slice(1)} Default`,
        value: url,
      })
      .addFields({
        name: "Triggered by",
        value: `<@${interaction.user.id}>`,
      });

    if (
      logChannel &&
      typeof logChannel.isTextBased === "function" &&
      logChannel.isTextBased()
    ) {
      try {
        await logChannel.send({ embeds: [setupEmbed] });
      } catch (error: unknown) {
        logger.warn({ error }, "Failed to send to log channel.");
      }

      await interaction.reply({
        content: "Updated Configs. This has been logged.",
        flags: MessageFlags.Ephemeral,
      });
    } else {
      await interaction.reply({
        embeds: [setupEmbed],
        flags: MessageFlags.Ephemeral,
      });
    }
  },
};

export default command;
