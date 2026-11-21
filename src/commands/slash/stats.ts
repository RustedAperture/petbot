import {
  ApplicationIntegrationType,
  ChatInputCommandInteraction,
  ContainerBuilder,
  GuildMember,
  InteractionContextType,
  MessageFlags,
  SlashCommandBuilder,
  User,
  type AutocompleteInteraction,
} from "discord.js";
import { getActionStatsContainer } from "../../utilities/actionHelpers.js";
import { listCustomNamesWithRows } from "../../utilities/customActions/resolver.js";
import { resolveStatsAction } from "../../utilities/customActions/statsAction.js";
import { ACTIONS } from "../../types/constants.js";
import { buildActionContextFor } from "../../utilities/customActions/context.js";
import { groupStatsCards } from "../../utilities/statsMessages.js";
import { respondWithActions } from "../actionAutocomplete.js";
import { UNAVAILABLE_MESSAGE } from "./action.js";

/** Built-ins plus the custom names the target has recorded rows for at this location. */
async function listStatsNames(
  targetId: string,
  locationId: string,
): Promise<string[]> {
  return [
    ...Object.keys(ACTIONS),
    ...(await listCustomNamesWithRows(targetId, locationId)),
  ];
}

export const command = {
  data: new SlashCommandBuilder()
    .setName("stats")
    .setDescription("Get the stats for a user")
    .addStringOption((option) =>
      option
        .setName("action")
        .setDescription("The action you want to get stats for")
        .setRequired(false)
        .setAutocomplete(true),
    )
    .addUserOption((option) =>
      option
        .setName("target")
        .setDescription("The user you want to get stats for")
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
  aliases: ["bite-stats", "pet-stats"],
  async autocomplete(interaction: AutocompleteInteraction) {
    const targetId =
      interaction.options.get("target")?.value?.toString() ?? interaction.user.id;
    const locationId = interaction.guildId ?? interaction.channelId;
    await respondWithActions(
      interaction,
      await listStatsNames(targetId, locationId),
    );
  },
  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    const targetId =
      interaction.options.getUser("target")?.id ?? interaction.user.id;
    const locationId = interaction.guildId ?? interaction.channelId;
    const names = await listStatsNames(targetId, locationId);
    const requested = interaction.options.getString("action");
    if (requested !== null && !names.includes(requested)) {
      await interaction.editReply({ content: UNAVAILABLE_MESSAGE });
      return;
    }

    const inServer = interaction.guild;
    const target = inServer
      ? interaction.options.getMember("target")
      : interaction.options.getUser("target");
    const action = interaction.options.getString("action");
    const guild = interaction.guildId ?? interaction.channelId;

    let targetUser: GuildMember | User;

    if (target !== null) {
      if (inServer && "user" in target) {
        targetUser = await inServer.members.fetch(target.user.id);
      } else {
        targetUser = target as GuildMember;
      }
    } else {
      switch (interaction.context) {
      case 0:
        if (interaction.member && "user" in interaction.member) {
          const member = interaction.member as { user: { id: string } };
          targetUser = inServer
            ? await inServer.members.fetch(member.user.id)
            : interaction.user;
        } else if (interaction.member) {
          targetUser = interaction.member as GuildMember;
        } else {
          targetUser = interaction.user;
        }
        break;
      default:
        targetUser = interaction.user;
        break;
      }
    }

    await targetUser.fetch(true);

    const containers: ContainerBuilder[] = [];
    const ctx = await buildActionContextFor({
      guildId: interaction.guildId,
      channelId: interaction.channelId,
      authorId: targetId,
      client: interaction.client,
    });
    const actionKinds = action !== null ? [action] : names;

    for (const kind of actionKinds) {
      const statsContainer = await getActionStatsContainer(
        await resolveStatsAction(kind, ctx),
        targetUser,
        guild,
      );
      containers.push(statsContainer);
    }

    const messages = groupStatsCards(containers);
    for (let i = 0; i < messages.length; i++) {
      const options = {
        components: messages[i],
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
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
