import {
  SlashCommandBuilder,
  ApplicationIntegrationType,
  InteractionContextType,
  MessageFlags,
  GuildMember,
  User,
} from "discord.js";
import { getPetStatsContainer } from "../../utilities/actionHelpers.js";
import { emitCommand } from "../../utilities/metrics.js";

export const command = {
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
    emitCommand("pet-stats");
    let target: GuildMember | User | null;
    const inServer = interaction.guild;
    const guild = interaction.guildId ?? interaction.channelId;

    if (interaction.context === 0 && inServer != null) {
      target = interaction.options.getMember("target");
      if (!target) {
        target = interaction.member as GuildMember;
      }
    } else {
      target = interaction.options.getUser("target");
    }

    if (target) {
      await target.fetch(true);
    } else {
      await interaction.reply({
        content: "Unable to identify the target user.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const container = await getPetStatsContainer(target, guild, inServer);

    if (typeof container === "object" && "type" in container) {
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

export default command;
