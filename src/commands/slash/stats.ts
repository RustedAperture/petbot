import {
  ApplicationIntegrationType,
  ChatInputCommandInteraction,
  ContainerBuilder,
  GuildMember,
  InteractionContextType,
  MessageFlags,
  SlashCommandBuilder,
  User,
} from "discord.js";
import { getActionStatsContainer } from "../../utilities/actionHelpers.js";
import { ACTIONS, type ActionType } from "../../types/constants.js";

export const command = {
  data: new SlashCommandBuilder()
    .setName("stats")
    .setDescription("Get the stats for a user")
    .addStringOption((option) =>
      option
        .setName("action")
        .setDescription("The action you want to get stats for")
        .setRequired(false)
        .addChoices(
          ...(Object.keys(ACTIONS).map((k) => ({ name: k, value: k })) as any),
        ),
    )
    .addUserOption((option) =>
      option
        .setName("target")
        .setDescription("The user you want to get stats for")
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
  aliases: ["bite-stats", "pet-stats"],
  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({
      flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
    });

    const inServer = interaction.guild;
    const target = inServer
      ? interaction.options.getMember("target")
      : interaction.options.getUser("target");
    const action = interaction.options.getString("action");
    const guild = interaction.guildId ?? interaction.channelId;

    let targetUser: GuildMember | User;

    if (target !== null) {
      if (inServer && "user" in target) {
        targetUser = await inServer.members.fetch(target.user.id);
      } else {
        targetUser = target as GuildMember;
      }
    } else {
      switch (interaction.context) {
        case 0:
          if (interaction.member && "user" in interaction.member) {
            const member = interaction.member as { user: { id: string } };
            targetUser = inServer
              ? await inServer.members.fetch(member.user.id)
              : interaction.user;
          } else if (interaction.member) {
            targetUser = interaction.member as GuildMember;
          } else {
            targetUser = interaction.user;
          }
          break;
        default:
          targetUser = interaction.user;
          break;
      }
    }

    await targetUser.fetch(true);

    const containers: ContainerBuilder[] = [];
    const actionKinds = Object.keys(ACTIONS) as ActionType[];

    for (const kind of actionKinds) {
      if (action !== null && action !== kind) continue;
      const statsContainer = await getActionStatsContainer(
        kind,
        targetUser,
        guild,
      );
      containers.push(statsContainer);
    }

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
