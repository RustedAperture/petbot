import {
  ApplicationIntegrationType,
  ChatInputCommandInteraction,
  InteractionContextType,
  MessageFlags,
  SlashCommandBuilder,
} from "discord.js";
import { emitCommand } from "../../utilities/metrics.js";
import { buildGlobalStatsContainer } from "../../components/buildGlobalStatsContainer.js";
import {
  fetchGlobalStats,
  fetchStatsForLocation,
} from "../../utilities/helper.js";

export const command = {
  data: new SlashCommandBuilder()
    .setName("botstats")
    .setDescription("Get the stats for the bot")
    .addBooleanOption((option) =>
      option
        .setName("local")
        .setDescription("Show stats only for this guild or channel")
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
  async execute(interaction: ChatInputCommandInteraction) {
    emitCommand("botstats");

    await interaction.deferReply({
      flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
    });

    const local = interaction.options.getBoolean("local");
    const location = interaction.guildId ?? interaction.channelId;

    const stats =
      local && location
        ? await fetchStatsForLocation(location)
        : await fetchGlobalStats();

    const container = buildGlobalStatsContainer(
      stats,
      Boolean(local && location),
    );

    await interaction.editReply({
      components: [container],
      flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
    });
  },
};

export default command;
