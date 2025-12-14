import {
  SlashCommandBuilder,
  ApplicationIntegrationType,
  InteractionContextType,
  MessageFlags,
} from "discord.js";
import { checkUserBite } from "../../utilities/check_user.js";
import { checkImage } from "../../utilities/check_image.js";
import { normalizeUrl } from "../../utilities/normalizeUrl.js";
import logger from "../../logger.js";
import { BiteData, BotData } from "../../utilities/db.js";
import { updateBite } from "../../utilities/update-bite.js";
import { resetBite } from "../../utilities/reset-bite.js";
import { emitCommand } from "../../utilities/metrics.js";

export const command = {
  data: new SlashCommandBuilder()
    .setName("change-bite")
    .setDescription("Update your bite settings")
    .addSubcommand((subcommand) =>
      subcommand
        .setName("update")
        .setDescription("Update your users bite image.")
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
        .setDescription("Remove your users bite image.")
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
    emitCommand("change-bite");
    const target = interaction.user;
    const everywhere = interaction.options.getBoolean("everywhere");
    let slot = interaction.options.getNumber("slot");

    const guild = interaction.guildId ?? interaction.channelId;

    await checkUserBite(target, guild);

    if (interaction.options.getSubcommand() === "update") {
      const uncleanUrl = interaction.options.getString("url");
      const url = normalizeUrl(uncleanUrl);

      if (slot >= 2) {
        const guildSettings = await BotData.findOne({
          where: {
            guild_id: guild,
          },
        });
        const defaultBase = "https://cloud.wfox.app/s/E9sXZLSAGw28M3K/preview";
        const bite = await BiteData.findOne({
          where: {
            user_id: target.id,
            guild_id: guild,
          },
        });

        const images = bite!.get("images");

        if (
          images[0] === defaultBase ||
          images[0] === guildSettings?.get("default_bite_image")
        ) {
          logger.debug("setting image while slot 1 is default");
          slot = 1;
        }
      }

      if (await checkImage(url)) {
        await updateBite(interaction, target.id, url, everywhere, null, slot);
      } else {
        await interaction.reply({
          content: "Your URL is invalid, please try again",
          flags: MessageFlags.Ephemeral,
        });
      }
    } else if (interaction.options.getSubcommand() === "remove") {
      await resetBite(interaction, target.id, slot);
      await interaction.reply({
        content: `Your image in slot ${slot} has been reset to the base image.`,
        flags: MessageFlags.Ephemeral,
      });
    }
  },
};

export default command;
