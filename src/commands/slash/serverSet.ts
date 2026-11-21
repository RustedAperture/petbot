import {
  SlashCommandBuilder,
  PermissionsBitField,
  EmbedBuilder,
  MessageFlags,
  type AutocompleteInteraction,
} from "discord.js";
import logger from "../../logger.js";
import { ACTIONS } from "../../types/constants.js";
import { GuildSettings } from "../../types/guild.js";
import { getBotData, upsertBotData } from "../../db/functions.js";
import { checkImage } from "../../utilities/check_image.js";
import { normalizeUrl } from "../../utilities/normalizeUrl.js";
import { setCustomActionImage } from "../../utilities/customActions/store.js";
import { listBuiltInAndGuildNames, respondWithActions } from "../actionAutocomplete.js";
import { UNAVAILABLE_MESSAGE } from "./action.js";

export const command = {
  data: new SlashCommandBuilder()
    .setName("server-set")
    .setDescription("Sets the default images for this server")
    .addStringOption((option) =>
      option
        .setName("action")
        .setDescription("The action for which you want to update the image")
        .setRequired(true)
        .setAutocomplete(true),
    )
    .addStringOption((option) =>
      option
        .setName("url")
        .setDescription("The url of the image that you would like to use")
        .setRequired(true),
    )
    .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator),
  async autocomplete(interaction: AutocompleteInteraction) {
    await respondWithActions(
      interaction,
      await listBuiltInAndGuildNames(interaction.guildId),
    );
  },
  async execute(interaction: any) {
    const action = interaction.options.getString("action");
    let url = interaction.options.getString("url");

    if (!action || !url) {
      return interaction.reply({
        content: "Both action and url are required.",
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

    const names = await listBuiltInAndGuildNames(guildId);
    if (!names.includes(action)) {
      return interaction.reply({
        content: UNAVAILABLE_MESSAGE,
        flags: MessageFlags.Ephemeral,
      });
    }

    const isBuiltIn = Object.hasOwn(ACTIONS, action);
    // checkImage can outlast Discord's 3s acknowledgement window, so acknowledge first.
    const respond = (payload: any) =>
      isBuiltIn ? interaction.reply(payload) : interaction.editReply(payload);
    if (!isBuiltIn) {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      url = normalizeUrl(url);
      if (!(await checkImage(url))) {
        return respond({ content: "Your URL is invalid, please try again" });
      }
      if (!(await setCustomActionImage("guild", guildId, action, url))) {
        return respond({ content: UNAVAILABLE_MESSAGE });
      }
    }
    const actionConfig = isBuiltIn
      ? ACTIONS[action as keyof typeof ACTIONS]
      : null;

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

    if (actionConfig) {
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
    }

    const noun = actionConfig?.noun ?? action;
    logger.debug(
      `Updated default ${noun} image for guild: ${interaction.guildId}`,
    );
    setupEmbed
      .setThumbnail(url)
      .addFields({
        name: `${noun[0].toUpperCase()}${noun.slice(1)} Default`,
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

      await respond({
        content: "Updated Configs. This has been logged.",
        flags: MessageFlags.Ephemeral,
      });
    } else {
      await respond({
        embeds: [setupEmbed],
        flags: MessageFlags.Ephemeral,
      });
    }
  },
};

export default command;
