import {
  SlashCommandBuilder,
  PermissionsBitField,
  EmbedBuilder,
  MessageFlags,
  TextChannel,
} from "discord.js";
import { drizzleDb } from "../../db/connector.js";
import { botData } from "../../db/schema.js";
import { eq } from "drizzle-orm";
import logger from "../../logger.js";
import { ACTIONS } from "../../types/constants.js";
import { GuildSettings } from "../../types/guild.js";

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

    const gsRows: GuildSettings[] = await drizzleDb
      .select()
      .from(botData)
      .where(eq(botData.guildId, interaction.guildId))
      .limit(1);
    const guildSettings = gsRows?.[0] ?? null;

    const setupEmbed = new EmbedBuilder().setTitle(
      "PetBot Server Config Updated",
    );

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

    const logChannelId = guildSettings?.logChannel;
    let logChannel: TextChannel | null = null;

    if (logChannelId) {
      try {
        logChannel = (await interaction.guild.channels.fetch(
          logChannelId as any,
        )) as TextChannel;
      } catch {
        logger.warn("No log channel has been setup yet!");
      }
    }

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
    map2[action] = url;

    await drizzleDb
      .update(botData)
      .set({ defaultImages: map2 })
      .where(eq(botData.guildId, interaction.guildId));

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
        value: `<@${interaction.member.id}>`,
      });

    if (logChannel) {
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
