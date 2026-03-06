import {
  ContextMenuCommandBuilder,
  ApplicationCommandType,
  ApplicationIntegrationType,
  InteractionContextType,
  MessageFlags,
} from "discord.js";
import { performAction } from "../../utilities/actionHelpers.js";
import { isOptedOut } from "../../utilities/check_user.js";

export const command = {
  data: new ContextMenuCommandBuilder()
    .setName("bite")
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
  aliases: ["bite-user"],
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

    const container = await performAction("bite", target, author, guild);

    await interaction.editReply({
      components: [container],
      flags: MessageFlags.IsComponentsV2,
    });
  },
};

export default command;
