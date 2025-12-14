import {
  SlashCommandBuilder,
  ApplicationIntegrationType,
  InteractionContextType,
  MessageFlags,
} from "discord.js";
import { getStatsContainer } from "../../utilities/actionHelpers.js";
import { emitCommand } from "../../utilities/metrics.js";

export const command = {
  data: new SlashCommandBuilder()
    .setName("bite-stats")
    .setDescription("Get the stats for a user")
    .addUserOption((option) =>
      option
        .setName("target")
        .setDescription("The user you want to get bite stats for")
        .setRequired(false),
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
    emitCommand("bite-stats");
    let target;
    const inServer = interaction.guild;
    const guild = interaction.guildId ?? interaction.channelId;

    if (interaction.context === 0 && inServer != null) {
      target = interaction.options.getMember("target");
      if (!target) {
        target = interaction.member;
      }
    } else {
      target = interaction.options.getUser("target");
    }

    await target.fetch(true);

    const container = await getStatsContainer(target, guild, inServer);

    if (typeof container === "object" && "type" in container) {
      await interaction.reply({
        content: container.content,
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    await interaction.reply({
      components: [container],
      flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
    });
  },
};

export default command;
