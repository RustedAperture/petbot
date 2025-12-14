const {
  SlashCommandBuilder,
  ApplicationIntegrationType,
  InteractionContextType,
  MessageFlags,
} = require("discord.js");
const logger = require("./../../logger");
const { performBite } = require("../../utilities/actionHelpers");
const { checkUserBite } = require("../../utilities/check_user");

module.exports = {
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

    const containers = [];

    for (const target of uniqueTargets) {
      await target.fetch(true);
      const container = await performBite(
        target,
        author,
        guild,
        inServer,
        logger,
      );
      containers.push(container);
    }

    for (let i = 0; i < uniqueTargets.length; i++) {
      const options = {
        components: [containers[i]],
        flags: MessageFlags.IsComponentsV2,
      };
      if (i === 0) {
        await interaction.reply(options);
      } else {
        await interaction.followUp(options);
      }
    }
  },
};
