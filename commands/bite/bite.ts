import {
  SlashCommandBuilder,
  ApplicationIntegrationType,
  InteractionContextType,
  MessageFlags,
  ContainerBuilder,
} from "discord.js";
import { performBite } from "../../utilities/actionHelpers.js";
import { checkUserBite } from "../../utilities/check_user.js";
import { emitCommand } from "../../utilities/metrics.js";

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
    emitCommand("bite");
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

    const targets = new Set([target1]);
    if (target2) {
      targets.add(target2);
    }
    if (target3) {
      targets.add(target3);
    }

    const uniqueTargets = [...targets];

    await checkUserBite(author, guild);

    const containers: ContainerBuilder[] = [];

    for (const target of uniqueTargets) {
      await target.fetch(true);
      const container = await performBite(target, author, guild);
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
