import {
  SlashCommandBuilder,
  ApplicationIntegrationType,
  InteractionContextType,
  MessageFlags,
  GuildMember,
  User,
} from "discord.js";
import { performAction } from "../../utilities/actionHelpers.js";
import { checkUser, isOptedOut } from "../../utilities/check_user.js";

export const command = {
  data: new SlashCommandBuilder()
    .setName("hug")
    .setDescription("Hugs another user")
    .addUserOption((option) =>
      option
        .setName("target1")
        .setDescription("The user you want to hug")
        .setRequired(true),
    )
    .addUserOption((option) =>
      option
        .setName("target2")
        .setDescription("The user you want to hug")
        .setRequired(false),
    )
    .addUserOption((option) =>
      option
        .setName("target3")
        .setDescription("The user you want to hug")
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

    const rawTargetUsers = [rawUser1, rawUser2, rawUser3].filter(
      (u): u is User => u != null,
    );
    const uniqueRawTargets = [
      ...new Map(rawTargetUsers.map((u) => [u.id, u])).values(),
    ];

    const optOutChecks = await Promise.all(
      uniqueRawTargets.map((u) => isOptedOut(u.id)),
    );
    const optedOutUserIds = new Set(
      uniqueRawTargets.filter((_, i) => optOutChecks[i]).map((u) => u.id),
    );

    if (optedOutUserIds.size === uniqueRawTargets.length) {
      await interaction.reply({
        content:
          "The target user(s) have opted out of PetBot and cannot be interacted with.",
        flags: MessageFlags.Ephemeral,
      });
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

    const targets = new Set<{ user: User; member?: GuildMember }>();
    const addTarget = (t: GuildMember | User | null) => {
      if (t) {
        const user = t instanceof GuildMember ? t.user : t;
        const member = t instanceof GuildMember ? t : undefined;
        if (
          !Array.from(targets).some((existing) => existing.user.id === user.id)
        ) {
          targets.add({ user, member });
        }
      }
    };

    addTarget(target1);
    addTarget(target2);
    addTarget(target3);

    const uniqueTargets = Array.from(targets);

    await checkUser("hug", author, guild);

    let firstReply = true;
    for (const { user, member } of uniqueTargets) {
      if (optedOutUserIds.has(user.id)) {
        await interaction.followUp({
          content: `<@${user.id}> has opted out of PetBot and cannot be interacted with.`,
          flags: MessageFlags.Ephemeral,
        });
        continue;
      }
      const target = member ?? user;
      await target.fetch(true);
      const container = await performAction("hug", target, author, guild);
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
