import {
  SlashCommandBuilder,
  ApplicationIntegrationType,
  InteractionContextType,
  MessageFlags,
} from "discord.js";
import { checkUser } from "../../utilities/check_user.js";
import { checkImage } from "../../utilities/check_image.js";
import { normalizeUrl } from "../../utilities/normalizeUrl.js";
import { resetAction } from "../../utilities/resetAction.js";
import { updateAction } from "../../utilities/updateAction.js";
import logger from "../../logger.js";
import { ActionData, BotData } from "../../utilities/db.js";
import { emitCommand } from "../../utilities/metrics.js";

export const command = {
  data: new SlashCommandBuilder()
    .setName("change-pet")
    .setDescription("Update your pet settings")
    .addSubcommand((subcommand) =>
      subcommand
        .setName("update")
        .setDescription("Update your users pet image.")
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
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("remove")
        .setDescription("Remove your users pet image.")
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
            .setDescription("Reset your image everywhere"),
        ),
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
  async execute(interaction) {
    emitCommand("change-pet");
    await interaction.deferReply();
    const target = interaction.user;
    const everywhere = interaction.options.getBoolean("everywhere");
    let slot = interaction.options.getNumber("slot");

    const guild = interaction.guildId ?? interaction.channelId;

    await checkUser("pet", target, guild);

    if (interaction.options.getSubcommand() === "update") {
      const uncleanUrl = interaction.options.getString("url");
      const url = normalizeUrl(uncleanUrl);

      if (slot >= 2) {
        const guildSettings = await BotData.findOne({
          where: {
            guild_id: guild,
          },
        });
        const defaultBase =
          "https://github.com/RustedAperture/Stickers/blob/main/Belly%20Rub%202.0/belly%20rub-base.png?raw=true";
        const pet = await ActionData.findOne({
          where: {
            user_id: target.id,
            location_id: guild,
            action_type: "pet",
          },
        });

        const images = (pet?.get("images") as string[]) || [];

        if (
          images[0] === defaultBase ||
          images[0] === guildSettings?.get("default_pet_image")
        ) {
          logger.debug("setting image while slot 1 is default");
          slot = 1;
        }
      }

      if (await checkImage(url)) {
        await updateAction(
          "pet",
          interaction,
          target.id,
          url,
          everywhere === true,
          null,
          slot,
        );
      } else {
        await interaction.editReply({
          content: "Your URL is invalid, please try again",
          flags: MessageFlags.Ephemeral,
        });
      }
    } else if (interaction.options.getSubcommand() === "remove") {
      await resetAction("pet", interaction, target.id, slot);
      await interaction.editReply({
        content: `Your image in slot ${slot} has been reset to the base image.`,
        flags: MessageFlags.Ephemeral,
      });
    }
  },
};

export default command;
