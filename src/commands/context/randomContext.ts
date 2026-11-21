import {
  ContextMenuCommandBuilder,
  ApplicationCommandType,
  ApplicationIntegrationType,
  InteractionContextType,
  MessageFlags,
} from "discord.js";
import { performAction } from "../../utilities/actionHelpers.js";
import { resolveAvailableActions } from "../../utilities/customActions/resolver.js";
import { buildActionContextFor } from "../../utilities/customActions/context.js";
import { isOptedOut } from "../../utilities/check_user.js";

export const command = {
  data: new ContextMenuCommandBuilder()
    .setName("random")
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
  aliases: ["random-user"],
  async execute(interaction) {
    const targetUserId = interaction.targetUser?.id;
    if (targetUserId && (await isOptedOut(targetUserId))) {
      await interaction.reply({
        content:
          "That user has opted out of PetBot and cannot be interacted with.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    await interaction.deferReply();

    let target, author;
    const inServer = interaction.guild;

    if (interaction.context === 0 && inServer != null) {
      target = interaction.targetMember;
      author = interaction.member;
    } else {
      target = interaction.targetUser;
      author = interaction.user;
    }

    const guild = interaction.guildId ?? interaction.channelId;

    await target.fetch(true);

    const ctx = await buildActionContextFor({
      guildId: interaction.guildId,
      channelId: interaction.channelId,
      authorId: interaction.user.id,
      targetId: interaction.targetUser.id,
    });
    const actions = await resolveAvailableActions(ctx);
    const action = actions[Math.floor(Math.random() * actions.length)];

    const container = await performAction(action, target, author, guild, {
      isRestricted: ctx.isRestricted,
    });

    await interaction.editReply({
      components: [container],
      flags: MessageFlags.IsComponentsV2,
    });
  },
};

export default command;
