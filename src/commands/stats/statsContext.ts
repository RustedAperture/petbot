import {
  ContextMenuCommandBuilder,
  ApplicationCommandType,
  ApplicationIntegrationType,
  InteractionContextType,
  MessageFlags,
  ContainerBuilder,
  UserContextMenuCommandInteraction,
} from "discord.js";
import { getActionStatsContainer } from "../../utilities/actionHelpers.js";
import { emitCommand } from "../../utilities/metrics.js";

export const command = {
  data: new ContextMenuCommandBuilder()
    .setName("stats")
    .setType(ApplicationCommandType.User)
    .setIntegrationTypes([
      ApplicationIntegrationType.GuildInstall,
      ApplicationIntegrationType.UserInstall,
    ])
    .setContexts([
      InteractionContextType.BotDM,
      InteractionContextType.Guild,
      InteractionContextType.PrivateChannel,
    ]),
  aliases: ["petStats", "biteStats"],
  async execute(interaction: UserContextMenuCommandInteraction) {
    emitCommand("stats");

    await interaction.deferReply({
      flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
    });

    let target;
    const inServer = interaction.guild;
    const guild = interaction.guildId ?? interaction.channelId;

    if (interaction.context === 0 && inServer != null) {
      target = interaction.targetMember;
    } else {
      target = interaction.targetUser;
    }

    await target.fetch(true);

    let containers: ContainerBuilder[] = [];

    const biteStats = await getActionStatsContainer("bite", target, guild);
    const petStats = await getActionStatsContainer("pet", target, guild);

    containers.push(petStats, biteStats);

    for (let i = 0; i < containers.length; i++) {
      const options = {
        components: [containers[i]],
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
      };
      if (i === 0) {
        await interaction.editReply(options);
      } else {
        await interaction.followUp(options);
      }
    }
  },
};

export default command;
