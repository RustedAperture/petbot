const {
  ContextMenuCommandBuilder,
  ApplicationCommandType,
  ApplicationIntegrationType,
  InteractionContextType,
  MessageFlags,
} = require("discord.js");
const { getStatsContainer } = require("../../utilities/actionHelpers");

module.exports = {
  data: new ContextMenuCommandBuilder()
    .setName("biteStats")
    .setType(ApplicationCommandType.User)
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
      target = interaction.targetMember;
    } else {
      target = interaction.targetUser;
    }

    await target.fetch(true);

    const container = await getStatsContainer(target, guild, inServer);

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
