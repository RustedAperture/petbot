const {
  SlashCommandBuilder,
  ApplicationIntegrationType,
  InteractionContextType,
  MessageFlags,
} = require("discord.js");
const { getPetStatsContainer } = require("../../utilities/actionHelpers");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("pet-stats")
    .setDescription("Get the stats for a user")
    .addUserOption((option) =>
      option
        .setName("target")
        .setDescription("The user you want to get pet stats for")
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
    let target;
    const inServer = interaction.guild;
    const guild = interaction.guildId ?? interaction.channelId;

    if (interaction.context === 0 && inServer != null) {
      target = interaction.options.getMember("target");
      if (!target) {
        target = interaction.member;
      }
    } else {
      target = interaction.options.getUser("target");
    }

    await target.fetch(true);

    const container = await getPetStatsContainer(target, guild, inServer);

    if (container.type === "noData") {
      await interaction.reply({
        content: container.content,
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    await interaction.reply({
      components: [container],
      flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
    });
  },
};
