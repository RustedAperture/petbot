import {
  SlashCommandBuilder,
  ApplicationIntegrationType,
  InteractionContextType,
  MessageFlags,
  ContainerBuilder,
  GuildMember,
  User,
} from "discord.js";
import { performAction } from "../../utilities/actionHelpers.js";
import { checkUser } from "../../utilities/check_user.js";

export const command = {
  data: new SlashCommandBuilder()
    .setName("squish")
    .setDescription("Squishes another user")
    .addUserOption((option) =>
      option
        .setName("target1")
        .setDescription("The user you want to squish")
        .setRequired(true),
    )
    .addUserOption((option) =>
      option
        .setName("target2")
        .setDescription("The user you want to squish")
        .setRequired(false),
    )
    .addUserOption((option) =>
      option
        .setName("target3")
        .setDescription("The user you want to squish")
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

    await checkUser("squish", author, guild);

    const containers: ContainerBuilder[] = [];

    for (const { user, member } of uniqueTargets) {
      const target = member ?? user;
      await target.fetch(true);
      const container = await performAction("squish", target, author, guild);
      containers.push(container);
    }

    for (let i = 0; i < uniqueTargets.length; i++) {
      const options = {
        components: [containers[i]],
        flags: MessageFlags.IsComponentsV2,
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
