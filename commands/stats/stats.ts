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
import { emitCommand } from "../../utilities/metrics.js";
import {
  getBiteStatsContainer,
  getPetStatsContainer,
} from "../../utilities/actionHelpers.js";

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
          { name: "Bite", value: "bite" },
          { name: "Pet", value: "pet" },
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
  async execute(interaction: ChatInputCommandInteraction) {
    emitCommand("stats");

    await interaction.deferReply({
      flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
    });

    const target = interaction.options.getMember("target");
    const action = interaction.options.getString("action");
    const inServer = interaction.guild;
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

    let containers: ContainerBuilder[] = [];

    if (action === "pet" || action === null) {
      const petStats = await getPetStatsContainer(targetUser, guild);
      containers.push(petStats);
    }

    if (action === "bite" || action === null) {
      const biteStats = await getBiteStatsContainer(targetUser, guild);
      containers.push(biteStats);
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
