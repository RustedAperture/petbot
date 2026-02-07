import {
  SlashCommandBuilder,
  ApplicationIntegrationType,
  InteractionContextType,
  MessageFlags,
} from "discord.js";
import { checkUser } from "../../utilities/check_user.js";
import { resetAction } from "../../utilities/resetAction.js";
import { emitCommand } from "../../utilities/metrics.js";
import { ACTIONS, type ActionType } from "../../types/constants.js";

export const command = {
  data: new SlashCommandBuilder()
    .setName("reset")
    .setDescription("Update your image to the default image")
    .addStringOption((option) =>
      option
        .setName("action")
        .setDescription("The action for which you want to reset the image")
        .setRequired(true)
        .addChoices(
          ...(Object.keys(ACTIONS).map((k) => ({ name: k, value: k })) as any),
        ),
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
        .setDescription("Reset your image everywhere"),
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
    await interaction.deferReply();
    const target = interaction.user;
    const everywhere = interaction.options.getBoolean("everywhere");
    const actionRaw = interaction.options.getString("action");

    if (!actionRaw || !(actionRaw in ACTIONS)) {
      await interaction.editReply({
        content: "Invalid action specified.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const action = actionRaw as ActionType;

    emitCommand(`/reset ${action}`);

    let slot = interaction.options.getNumber("slot");

    const guild = interaction.guildId ?? interaction.channelId;

    await checkUser(action, target, guild);

    await resetAction(action, interaction, target.id, slot, !!everywhere);
    await interaction.editReply({
      content: `Your image in slot ${slot} for ${action} has been reset to the base image.`,
      flags: MessageFlags.Ephemeral,
    });
  },
};

export default command;
