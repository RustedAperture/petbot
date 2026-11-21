import {
  SlashCommandBuilder,
  ApplicationIntegrationType,
  InteractionContextType,
  MessageFlags,
  type AutocompleteInteraction,
} from "discord.js";
import { checkUser } from "../../utilities/check_user.js";
import { checkImage } from "../../utilities/check_image.js";
import { normalizeUrl } from "../../utilities/normalizeUrl.js";
import logger from "../../logger.js";
import { drizzleDb } from "../../db/connector.js";
import { actionData, botData } from "../../db/schema.js";
import { eq, and } from "drizzle-orm";
import { updateAction } from "../../utilities/updateAction.js";
import { ACTIONS, type ActionType } from "../../types/constants.js";
import { listSettableActionNames } from "../../utilities/customActions/resolver.js";
import { buildActionContext, respondWithActions } from "../actionAutocomplete.js";
import { UNAVAILABLE_MESSAGE } from "./action.js";

export const command = {
  data: new SlashCommandBuilder()
    .setName("set")
    .setDescription("Update the images used for various actions")
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
    .addNumberOption((option) =>
      option
        .setName("slot")
        .setDescription(
          "1-4 These are your slots, if left undefined then it will default to 1",
        )
        .setRequired(true)
        .addChoices(
          { name: "1", value: 1 },
          { name: "2", value: 2 },
          { name: "3", value: 3 },
          { name: "4", value: 4 },
        ),
    )
    .addBooleanOption((option) =>
      option
        .setName("everywhere")
        .setDescription("Update your image everywhere"),
    )
    .setIntegrationTypes([
      ApplicationIntegrationType.GuildInstall,
      ApplicationIntegrationType.UserInstall,
    ])
    .setContexts([
      InteractionContextType.BotDM,
      InteractionContextType.Guild,
      InteractionContextType.PrivateChannel,
    ]),
  async autocomplete(interaction: AutocompleteInteraction) {
    const ctx = await buildActionContext(interaction);
    await respondWithActions(interaction, await listSettableActionNames(ctx));
  },
  async execute(interaction) {
    await interaction.deferReply();
    const target = interaction.user;
    const everywhere = interaction.options.getBoolean("everywhere");
    const actionRaw = interaction.options.getString("action");

    const names = await listSettableActionNames(
      await buildActionContext(interaction),
    );
    if (!actionRaw || !names.includes(actionRaw)) {
      await interaction.editReply({
        content: UNAVAILABLE_MESSAGE,
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const action = actionRaw;

    let slot = interaction.options.getNumber("slot");

    const guild = interaction.guildId ?? interaction.channelId;

    await checkUser(action, target, guild);

    const uncleanUrl = interaction.options.getString("url");
    const url = normalizeUrl(uncleanUrl);

    if (slot >= 2) {
      const gsRows: any[] = await drizzleDb
        .select()
        .from(botData)
        .where(eq(botData.guildId, guild))
        .limit(1);
      const guildSettings = gsRows?.[0] ?? null;

      const adRows: any[] = await drizzleDb
        .select()
        .from(actionData)
        .where(
          and(
            eq(actionData.userId, target.id),
            eq(actionData.locationId, guild),
            eq(actionData.actionType, action),
          ),
        )
        .limit(1);
      const adRow = adRows?.[0] ?? null;
      const images: string[] = adRow ? (adRow.images as string[]) : [];

      const defaultBase = Object.hasOwn(ACTIONS, action)
        ? ACTIONS[action as ActionType].defaultImage
        : undefined;
      const defaultImagesRaw = guildSettings?.defaultImages;
      const guildDefault =
        defaultImagesRaw && typeof defaultImagesRaw === "object"
          ? (defaultImagesRaw as Record<string, string>)[action]
          : undefined;

      if (images[0] === defaultBase || images[0] === guildDefault) {
        logger.debug("setting image while slot 1 is default");
        slot = 1;
      }
    }

    if (await checkImage(url)) {
      await updateAction(
        action,
        interaction,
        target.id,
        url,
        everywhere,
        null,
        slot,
      );
    } else {
      await interaction.editReply({
        content: "Your URL is invalid, please try again",
        flags: MessageFlags.Ephemeral,
      });
    }
  },
};

export default command;
