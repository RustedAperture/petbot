import {
  ApplicationIntegrationType,
  ChatInputCommandInteraction,
  InteractionContextType,
  MessageFlags,
  SlashCommandBuilder,
} from "discord.js";
import { emitCommand } from "../../utilities/metrics.js";
import { buildGlobalStatsContainer } from "../../components/buildGlobalStatsContainer.js";
import { fetchGlobalStats } from "../../utilities/helper.js";

export const command = {
  data: new SlashCommandBuilder()
    .setName("botstats")
    .setDescription("Get the stats for the bot")
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

    const stats = await fetchGlobalStats();

    const container = buildGlobalStatsContainer(stats);

    await interaction.editReply({
      components: [container],
      flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
    });
  },
};

export default command;
