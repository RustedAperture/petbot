import {
  SlashCommandBuilder,
  PermissionsBitField,
  EmbedBuilder,
  MessageFlags,
} from "discord.js";
import { BotData } from "../../utilities/db.js";
import logger from "../../logger.js";
import { emitCommand } from "../../utilities/metrics.js";

export const command = {
  data: new SlashCommandBuilder()
    .setName("server-setup")
    .setDescription("Setup a bot when added to a guild")
    .addStringOption((option) =>
      option
        .setName("nickname")
        .setDescription("The nickname for the bot")
        .setRequired(false),
    )
    .addChannelOption((option) =>
      option
        .setName("log_channel")
        .setDescription("The Channel that the bot should log too")
        .setRequired(false),
    )
    .addStringOption((option) =>
      option
        .setName("default_pet")
        .setDescription(
          "The URL for the default pet emoji, used when a user doesnt have one already.",
        )
        .setRequired(false),
    )
    .addStringOption((option) =>
      option
        .setName("sleep_image")
        .setDescription("The URL for the sleep image command.")
        .setRequired(false),
    )
    .addStringOption((option) =>
      option
        .setName("default_bite")
        .setDescription(
          "The URL for the default bite emoji, used when a user doesnt have one already.",
        )
        .setRequired(false),
    )
    .addStringOption((option) =>
      option
        .setName("default_hug")
        .setDescription(
          "The URL for the default hug image, used when a user doesnt have one already.",
        )
        .setRequired(false),
    )
    .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator),
  async execute(interaction: any) {
    emitCommand("serverSetup");
    const nickname = interaction.options.getString("nickname");
    const defaultPet = interaction.options.getString("default_pet");
    const defaultBite = interaction.options.getString("default_bite");
    const defaultHug = interaction.options.getString("default_hug");
    const guildSettings = await BotData.findOne({
      where: {
        guild_id: interaction.guildId,
      },
    });

    let logChannel = interaction.options.getChannel("log_channel");

    const sleepImage = interaction.options.getString("sleep_image");

    const setupEmbed = new EmbedBuilder().setTitle("Setup");

    if (!guildSettings) {
      await BotData.create({
        guild_id: interaction.guildId,
        default_images: null,
        log_channel: "",
        nickname: "",
        sleep_image: "",
      } as any);
    }

    if (!logChannel) {
      try {
        logChannel = await interaction.guild.channels.fetch(
          guildSettings!.get("log_channel"),
        );
      } catch {
        logger.warn("No log channel has been setup yet!");
      }
    }

    if (nickname != null) {
      const [affectedRows] = await BotData.update(
        { nickname: nickname },
        { where: { guild_id: interaction.guildId } },
      );

      if (affectedRows > 0) {
        logger.debug(
          `Updated nickname of bot for guild: ${interaction.guildId}`,
        );
        setupEmbed.addFields({ name: "Nickname", value: nickname });
      }

      const botId = interaction.client.application.id;
      const bot = await interaction.guild.members.fetch(botId);
      bot.setNickname(nickname);
    }
    if (logChannel != null) {
      const [affectedRows] = await BotData.update(
        { log_channel: logChannel.id },
        { where: { guild_id: interaction.guildId } },
      );

      if (affectedRows > 0) {
        logger.debug(
          `Updated log channel of bot for guild: ${interaction.guildId}`,
        );
        setupEmbed.addFields({
          name: "Log Channel",
          value: `<#${logChannel.id}>`,
        });
      }
    }
    if (defaultPet != null) {
      // merge into the JSON map so future lookups prefer `default_images`
      const botRow = await BotData.findOne({
        where: { guild_id: interaction.guildId },
      });
      const current = botRow?.get("default_images") as any;
      const map =
        current && typeof current === "object"
          ? { ...current }
          : current
            ? JSON.parse(current)
            : {};
      map.pet = defaultPet;

      const [affectedRows] = await BotData.update(
        { default_images: map },
        { where: { guild_id: interaction.guildId } },
      );

      if (affectedRows > 0) {
        logger.debug(
          `Updated default image of bot for guild: ${interaction.guildId}`,
        );
        setupEmbed.addFields({
          name: "Default Image",
          value: defaultPet,
        });
      }
    }
    if (sleepImage != null) {
      const [affectedRows] = await BotData.update(
        { sleep_image: sleepImage },
        { where: { guild_id: interaction.guildId } },
      );

      if (affectedRows > 0) {
        logger.debug(
          `Updated sleep image of bot for guild: ${interaction.guildId}`,
        );
        setupEmbed.addFields({
          name: "Default Image",
          value: sleepImage,
        });
      }
    }

    if (defaultBite != null) {
      // merge into the JSON map so future lookups prefer `default_images`
      const botRow = await BotData.findOne({
        where: { guild_id: interaction.guildId },
      });
      const current = botRow?.get("default_images") as any;
      const map =
        current && typeof current === "object"
          ? { ...current }
          : current
            ? JSON.parse(current)
            : {};
      map.bite = defaultBite;

      const [affectedRows] = await (BotData.update as any)(
        { default_images: map } as any,
        { where: { guild_id: interaction.guildId } },
      );

      if (affectedRows > 0) {
        logger.debug(
          `Updated default image of bot for guild: ${interaction.guildId}`,
        );
        setupEmbed.addFields({
          name: "Default Image",
          value: defaultBite,
        });
      }
    }

    if (defaultHug != null) {
      // merge into the JSON map so future lookups prefer `default_images`
      const botRow = await BotData.findOne({
        where: { guild_id: interaction.guildId },
      });
      const current = botRow?.get("default_images") as any;
      const map =
        current && typeof current === "object"
          ? { ...current }
          : current
            ? JSON.parse(current)
            : {};
      map.hug = defaultHug;

      const [affectedRows] = await (BotData.update as any)(
        { default_images: map } as any,
        { where: { guild_id: interaction.guildId } },
      );

      if (affectedRows > 0) {
        logger.debug(
          `Updated default hug image for guild: ${interaction.guildId}`,
        );
        setupEmbed.addFields({
          name: "Hug Default",
          value: defaultHug,
        });
      }
    }

    setupEmbed.addFields({
      name: "Triggered by",
      value: `<@${interaction.member.id}>`,
    });

    try {
      logChannel.send({ embeds: [setupEmbed] });
      interaction.reply({
        content: "Updated Configs. This has been logged.",
        flags: MessageFlags.Ephemeral,
      });
    } catch {
      interaction.reply({
        content: "No log channel has been set yet.",
        flags: MessageFlags.Ephemeral,
      });
    }
  },
};

export default command;
