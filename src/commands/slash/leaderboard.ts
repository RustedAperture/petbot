import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  MessageFlags,
  InteractionContextType,
  ApplicationIntegrationType,
  EmbedBuilder,
  type AutocompleteInteraction,
} from "discord.js";
import { getLeaderboard } from "../../utilities/leaderboard.js";
import { listBuiltInAndGuildNames, respondWithActions } from "../actionAutocomplete.js";
import { UNAVAILABLE_MESSAGE } from "./action.js";

export const command = {
  data: new SlashCommandBuilder()
    .setName("leaderboard")
    .setDescription("View the top 10 action rankings")
    .addStringOption((option) =>
      option
        .setName("action")
        .setDescription("Filter by action type (omit for all actions)")
        .setRequired(false)
        .setAutocomplete(true),
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

  async autocomplete(interaction: AutocompleteInteraction) {
    await respondWithActions(
      interaction,
      await listBuiltInAndGuildNames(interaction.guildId),
    );
  },

  async execute(interaction: ChatInputCommandInteraction) {
    const requested = interaction.options.getString("action");
    if (
      requested &&
      !(await listBuiltInAndGuildNames(interaction.guildId)).includes(requested)
    ) {
      await interaction.reply({
        content: UNAVAILABLE_MESSAGE,
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

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
