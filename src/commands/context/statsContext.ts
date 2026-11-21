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
import { listCustomNamesWithRows } from "../../utilities/customActions/resolver.js";
import { groupStatsCards } from "../../utilities/statsMessages.js";
import { ACTIONS } from "../../types/constants.js";
import { resolveStatsAction } from "../../utilities/customActions/statsAction.js";
import { buildActionContextFor } from "../../utilities/customActions/context.js";

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

    const containers: ContainerBuilder[] = [];

    const ctx = await buildActionContextFor({
      guildId: interaction.guildId,
      channelId: interaction.channelId,
      authorId: interaction.targetUser.id,
      client: interaction.client,
    });
    const kinds = [
      ...Object.keys(ACTIONS),
      ...(await listCustomNamesWithRows(interaction.targetUser.id, guild)),
    ];
    for (const kind of kinds) {
      const stats = await getActionStatsContainer(
        await resolveStatsAction(kind, ctx),
        target,
        guild,
      );
      containers.push(stats);
    }

    const messages = groupStatsCards(containers);

    for (let i = 0; i < messages.length; i++) {
      const options = {
        components: messages[i],
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
