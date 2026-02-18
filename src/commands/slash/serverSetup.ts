import {
  SlashCommandBuilder,
  PermissionsBitField,
  EmbedBuilder,
  MessageFlags,
} from "discord.js";
import { drizzleDb } from "../../db/connector.js";
import { botData } from "../../db/schema.js";
import { eq } from "drizzle-orm";
import logger from "../../logger.js";

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
    .addStringOption((option) =>
      option
        .setName("default_bonk")
        .setDescription(
          "The URL for the default bonk image, used when a user doesnt have one already.",
        )
        .setRequired(false),
    )
    .addStringOption((option) =>
      option
        .setName("default_squish")
        .setDescription(
          "The URL for the default squish image, used when a user doesnt have one already.",
        )
        .setRequired(false),
    )
    .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator),
  async execute(interaction: any) {
    const nickname = interaction.options.getString("nickname");
    const defaultPet = interaction.options.getString("default_pet");
    const defaultBite = interaction.options.getString("default_bite");
    const defaultHug = interaction.options.getString("default_hug");
    const defaultBonk = interaction.options.getString("default_bonk");
    const defaultSquish = interaction.options.getString("default_squish");
    const gsRows: any[] = await drizzleDb
      .select()
      .from(botData)
      .where(eq(botData.guildId, interaction.guildId))
      .limit(1);
    const guildSettings = gsRows?.[0] ?? null;

    let logChannel = interaction.options.getChannel("log_channel");

    const sleepImage = interaction.options.getString("sleep_image");

    const setupEmbed = new EmbedBuilder().setTitle("Setup");

    if (!guildSettings) {
      await drizzleDb.insert(botData).values({
        guildId: interaction.guildId,
        defaultImages: null,
        logChannel: "",
        nickname: "",
        sleepImage: "",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } as any);
    }

    if (!logChannel) {
      try {
        const logChannelId =
          typeof guildSettings?.get === "function"
            ? guildSettings!.logChannel
            : guildSettings?.logChannel;
        logChannel = await interaction.guild.channels.fetch(
          logChannelId as any,
        );
      } catch {
        logger.warn("No log channel has been setup yet!");
      }
    }

    if (nickname != null) {
      await drizzleDb
        .update(botData)
        .set({ nickname: nickname })
        .where(eq(botData.guildId, interaction.guildId));
      logger.debug(`Updated nickname of bot for guild: ${interaction.guildId}`);
      setupEmbed.addFields({ name: "Nickname", value: nickname });

      const botId = interaction.client.application.id;
      const bot = await interaction.guild.members.fetch(botId);
      bot.setNickname(nickname);
    }
    if (logChannel != null) {
      await drizzleDb
        .update(botData)
        .set({ logChannel: logChannel.id })
        .where(eq(botData.guildId, interaction.guildId));
      logger.debug(
        `Updated log channel of bot for guild: ${interaction.guildId}`,
      );
      setupEmbed.addFields({
        name: "Log Channel",
        value: `<#${logChannel.id}>`,
      });
    }
    if (defaultPet != null) {
      // merge into the JSON map so future lookups prefer `defaultImages`
      const gsRows: any[] = await drizzleDb
        .select()
        .from(botData)
        .where(eq(botData.guildId, interaction.guildId))
        .limit(1);
      const botRow = gsRows?.[0] ?? null;
      const current = botRow?.defaultImages as any;
      const map =
        current && typeof current === "object"
          ? { ...current }
          : current
            ? JSON.parse(current)
            : {};
      map.pet = defaultPet;

      await drizzleDb
        .update(botData)
        .set({ defaultImages: map })
        .where(eq(botData.guildId, interaction.guildId));
      logger.debug(
        `Updated default image of bot for guild: ${interaction.guildId}`,
      );
      setupEmbed.addFields({ name: "Default Image", value: defaultPet });
    }
    if (sleepImage != null) {
      await drizzleDb
        .update(botData)
        .set({ sleepImage: sleepImage })
        .where(eq(botData.guildId, interaction.guildId));

      const updated = await drizzleDb
        .select()
        .from(botData)
        .where(eq(botData.guildId, interaction.guildId))
        .limit(1);

      if ((updated?.[0]?.sleepImage ?? "") === sleepImage) {
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
      // merge into the JSON map so future lookups prefer `defaultImages`
      const gsRows2: any[] = await drizzleDb
        .select()
        .from(botData)
        .where(eq(botData.guildId, interaction.guildId))
        .limit(1);
      const botRow2 = gsRows2?.[0] ?? null;
      const current2 = botRow2?.defaultImages as any;
      const map2 =
        current2 && typeof current2 === "object"
          ? { ...current2 }
          : current2
            ? JSON.parse(current2)
            : {};
      map2.bite = defaultBite;

      await drizzleDb
        .update(botData)
        .set({ defaultImages: map2 })
        .where(eq(botData.guildId, interaction.guildId));
      logger.debug(
        `Updated default image of bot for guild: ${interaction.guildId}`,
      );
      setupEmbed.addFields({ name: "Default Image", value: defaultBite });
    }

    if (defaultHug != null) {
      // merge into the JSON map so future lookups prefer `defaultImages`
      const gsRows3: any[] = await drizzleDb
        .select()
        .from(botData)
        .where(eq(botData.guildId, interaction.guildId))
        .limit(1);
      const botRow3 = gsRows3?.[0] ?? null;
      const current3 = botRow3?.defaultImages as any;
      const map3 =
        current3 && typeof current3 === "object"
          ? { ...current3 }
          : current3
            ? JSON.parse(current3)
            : {};
      map3.hug = defaultHug;

      await drizzleDb
        .update(botData)
        .set({ defaultImages: map3 })
        .where(eq(botData.guildId, interaction.guildId));
      logger.debug(
        `Updated default hug image for guild: ${interaction.guildId}`,
      );
      setupEmbed.addFields({ name: "Hug Default", value: defaultHug });
    }

    if (defaultBonk != null) {
      // merge into the JSON map so future lookups prefer `defaultImages`
      const gsRows4: any[] = await drizzleDb
        .select()
        .from(botData)
        .where(eq(botData.guildId, interaction.guildId))
        .limit(1);
      const botRow4 = gsRows4?.[0] ?? null;
      const current4 = botRow4?.defaultImages as any;
      const map4 =
        current4 && typeof current4 === "object"
          ? { ...current4 }
          : current4
            ? JSON.parse(current4)
            : {};
      map4.bonk = defaultBonk;

      await drizzleDb
        .update(botData)
        .set({ defaultImages: map4 })
        .where(eq(botData.guildId, interaction.guildId));
      logger.debug(
        `Updated default bonk image for guild: ${interaction.guildId}`,
      );
      setupEmbed.addFields({ name: "Bonk Default", value: defaultBonk });
    }

    if (defaultSquish != null) {
      // merge into the JSON map so future lookups prefer `defaultImages`
      const gsRows5: any[] = await drizzleDb
        .select()
        .from(botData)
        .where(eq(botData.guildId, interaction.guildId))
        .limit(1);
      const botRow5 = gsRows5?.[0] ?? null;
      const current5 = botRow5?.defaultImages as any;
      const map5 =
        current5 && typeof current5 === "object"
          ? { ...current5 }
          : current5
            ? JSON.parse(current5)
            : {};
      map5.squish = defaultSquish;

      await drizzleDb
        .update(botData)
        .set({ defaultImages: map5 })
        .where(eq(botData.guildId, interaction.guildId));
      logger.debug(
        `Updated default squish image for guild: ${interaction.guildId}`,
      );
      setupEmbed.addFields({ name: "Squish Default", value: defaultSquish });
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
