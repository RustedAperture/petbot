import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  MessageFlags,
  InteractionContextType,
  ApplicationIntegrationType,
  EmbedBuilder,
} from "discord.js";
import { getLeaderboard } from "../../utilities/leaderboard.js";

export const command = {
  data: new SlashCommandBuilder()
    .setName("leaderboard")
    .setDescription("View the top 10 action rankings")
    .addStringOption((option) =>
      option
        .setName("action")
        .setDescription("Filter by action type (omit for all actions)")
        .setRequired(false)
        .addChoices(
          { name: "Pet", value: "pet" },
          { name: "Bite", value: "bite" },
          { name: "Hug", value: "hug" },
          { name: "Bonk", value: "bonk" },
          { name: "Squish", value: "squish" },
          { name: "Explode", value: "explode" },
        ),
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

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({
      flags: MessageFlags.Ephemeral,
    });

    const actionType = interaction.options.getString("action") ?? undefined;
    const locationId = interaction.guildId ?? interaction.channelId;
    if (!locationId) {
      await interaction.editReply("Could not determine location.");
      return;
    }

    const result = await getLeaderboard({
      locationId,
      actionType,
      limit: 10,
      discordClient: interaction.client,
    });

    if (result.entries.length === 0) {
      await interaction.editReply("No actions recorded here yet.");
      return;
    }

    const rankEmojis = ["🥇", "🥈", "🥉"];
    const title = actionType
      ? `Leaderboard — ${actionType}`
      : "Leaderboard — All Actions";

    const description = result.entries
      .map((entry) => {
        const emoji = rankEmojis[entry.rank - 1] ?? `#${entry.rank}`;
        const label = entry.displayName ?? `User #${entry.anonymousLabel}`;
        const you = entry.userId === interaction.user.id ? " **(you)**" : "";
        return `${emoji} ${label} — ${entry.totalActions}${you}`;
      })
      .join("\n");

    const embed = new EmbedBuilder()
      .setTitle(title)
      .setDescription(description)
      .setColor(0xf59e0b)
      .setFooter({ text: `Location: ${locationId}` });

    await interaction.editReply({ embeds: [embed] });
  },
};

export default command;
