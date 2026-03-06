import {
  SlashCommandBuilder,
  ApplicationIntegrationType,
  InteractionContextType,
  MessageFlags,
} from "discord.js";
import { performAction } from "../../utilities/actionHelpers.js";
import { checkUser } from "../../utilities/check_user.js";
import { collectUniqueUsers } from "../../utilities/targetCollection.js";
import { checkOptOuts } from "../../utilities/optOutHelper.js";

export const command = {
  data: new SlashCommandBuilder()
    .setName("bite")
    .setDescription("Bites another user")
    .addUserOption((option) =>
      option
        .setName("target1")
        .setDescription("The user you want to bite")
        .setRequired(true),
    )
    .addUserOption((option) =>
      option
        .setName("target2")
        .setDescription("The user you want to bite")
        .setRequired(false),
    )
    .addUserOption((option) =>
      option
        .setName("target3")
        .setDescription("The user you want to bite")
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

    let target1, target2, target3, author;
    const inServer = interaction.guild;

    if (interaction.context === 0 && inServer != null) {
      target1 = await interaction.options.getMember("target1");
      target2 = await interaction.options.getMember("target2");
      target3 = await interaction.options.getMember("target3");
      author = interaction.member;
    } else {
      target1 = await interaction.options.getUser("target1");
      target2 = await interaction.options.getUser("target2");
      target3 = await interaction.options.getUser("target3");
      author = interaction.user;
    }

    const guild = interaction.guildId ?? interaction.channelId;

    // dedupe by user id using shared helper
    // convert the pair objects back into the raw member/user values
    const uniqueTargets = collectUniqueUsers(target1, target2, target3).map(
      ({ user, member }) => member ?? user,
    );

    await checkUser("bite", author, guild);

    let firstReply = true;
    for (const target of uniqueTargets) {
      const userId = (target as any).user?.id ?? (target as any).id;
      if (optedOutIds.has(userId)) {
        await interaction.followUp({
          content: `<@${userId}> has opted out of PetBot and cannot be interacted with.`,
          flags: MessageFlags.Ephemeral,
        });
        continue;
      }
      await target.fetch(true);
      const container = await performAction("bite", target, author, guild);
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
