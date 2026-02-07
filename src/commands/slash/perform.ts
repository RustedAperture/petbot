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
import { emitCommand } from "../../utilities/metrics.js";
import { ACTIONS, type ActionType } from "../../types/constants.js";

export const command = {
  data: new SlashCommandBuilder()
    .setName("perform")
    .setDescription("Performs a specific action on one or more users")
    .addStringOption((option) =>
      // add choices based on ACTIONS
      option
        .setName("action")
        .setDescription("The action to perform")
        .setRequired(true)
        .addChoices(
          ...(Object.keys(ACTIONS).map((k) => ({ name: k, value: k })) as any),
        ),
    )
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
    .addUserOption((option) =>
      option
        .setName("target4")
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
    emitCommand("perform");
    await interaction.deferReply();

    let target1: GuildMember | User | null;
    let target2: GuildMember | User | null;
    let target3: GuildMember | User | null;
    let target4: GuildMember | User | null;
    let author: GuildMember | User;
    const inServer = interaction.guild;

    if (interaction.context === 0 && inServer != null) {
      target1 = await interaction.options.getMember("target1");
      target2 = await interaction.options.getMember("target2");
      target3 = await interaction.options.getMember("target3");
      target4 = await interaction.options.getMember("target4");
      author = interaction.member as GuildMember;
    } else {
      target1 = await interaction.options.getUser("target1");
      target2 = await interaction.options.getUser("target2");
      target3 = await interaction.options.getUser("target3");
      target4 = await interaction.options.getUser("target4");
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
    addTarget(target4);

    const uniqueTargets = Array.from(targets);

    const actionRaw = interaction.options.getString("action");
    if (!actionRaw || !(actionRaw in ACTIONS)) {
      await interaction.editReply({
        content: "Invalid action",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }
    const action = actionRaw as ActionType;

    await checkUser(action, author, guild);

    // Fetch targets & ensure they have check entries concurrently
    const targetsArray = uniqueTargets.map(
      ({ user, member }) => member ?? user,
    );

    await Promise.all(targetsArray.map((t) => t.fetch && t.fetch(true)));
    await Promise.all(targetsArray.map((t) => checkUser(action, t, guild)));

    const containers: ContainerBuilder[] = [];

    for (const target of targetsArray) {
      const container = await performAction(action, target, author, guild, {
        skipChecks: true,
      });
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
