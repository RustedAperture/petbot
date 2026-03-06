import {
  SlashCommandBuilder,
  ApplicationIntegrationType,
  InteractionContextType,
  MessageFlags,
  GuildMember,
  User,
} from "discord.js";
import { performAction } from "../../utilities/actionHelpers.js";
// isOptedOut no longer needed; opt-out logic handled by helper
import { ACTIONS, type ActionType } from "../../types/constants.js";
import { collectUniqueUsers } from "../../utilities/targetCollection.js";
import { checkOptOuts } from "../../utilities/optOutHelper.js";

export const command = {
  data: new SlashCommandBuilder()
    .setName("random")
    .setDescription("Performs a random action on one or more users")
    .addUserOption((option) =>
      option
        .setName("target1")
        .setDescription("The user you want to target")
        .setRequired(true),
    )
    .addUserOption((option) =>
      option
        .setName("target2")
        .setDescription("The user you want to target")
        .setRequired(false),
    )
    .addUserOption((option) =>
      option
        .setName("target3")
        .setDescription("The user you want to target")
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
    const rawUser1 = interaction.options.getUser("target1");
    const rawUser2 = interaction.options.getUser("target2");
    const rawUser3 = interaction.options.getUser("target3");

    const { optedOutIds, allOptedOut } = await checkOptOuts(interaction, [
      rawUser1,
      rawUser2,
      rawUser3,
    ]);
    if (allOptedOut) {
      return;
    }

    await interaction.deferReply();

    let target1: GuildMember | User | null;
    let target2: GuildMember | User | null;
    let target3: GuildMember | User | null;
    let author: GuildMember | User;
    const inServer = interaction.guild;

    if (interaction.context === 0 && inServer != null) {
      target1 = await interaction.options.getMember("target1");
      target2 = await interaction.options.getMember("target2");
      target3 = await interaction.options.getMember("target3");
      author = interaction.member as GuildMember;
    } else {
      target1 = await interaction.options.getUser("target1");
      target2 = await interaction.options.getUser("target2");
      target3 = await interaction.options.getUser("target3");
      author = interaction.user;
    }

    const guild = interaction.guildId ?? interaction.channelId!;

    const uniqueTargets = collectUniqueUsers(target1, target2, target3);

    const actionKinds = Object.keys(ACTIONS) as ActionType[];

    let firstReply = true;
    for (const { user, member } of uniqueTargets) {
      if (optedOutIds.has(user.id)) {
        await interaction.followUp({
          content: `<@${user.id}> has opted out of PetBot and cannot be interacted with.`,
          flags: MessageFlags.Ephemeral,
        });
        continue;
      }
      const action =
        actionKinds[Math.floor(Math.random() * actionKinds.length)];
      const target = member ?? user;
      await target.fetch(true);
      const container = await performAction(action, target, author, guild);
      const replyOptions = {
        components: [container],
        flags: MessageFlags.IsComponentsV2,
      };
      if (firstReply) {
        await interaction.editReply(replyOptions);
        firstReply = false;
      } else {
        await interaction.followUp(replyOptions);
      }
    }
  },
};

export default command;
