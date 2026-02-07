import {
  ContextMenuCommandBuilder,
  ApplicationCommandType,
  ApplicationIntegrationType,
  InteractionContextType,
  MessageFlags,
} from "discord.js";
import { performAction } from "../../utilities/actionHelpers.js";
import { emitCommand } from "../../utilities/metrics.js";
import { ACTIONS, type ActionType } from "../../types/constants.js";

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
    emitCommand("random-user");
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

    const actionKinds = Object.keys(ACTIONS) as ActionType[];
    const action = actionKinds[Math.floor(Math.random() * actionKinds.length)];

    const container = await performAction(action, target, author, guild);

    await interaction.editReply({
      components: [container],
      flags: MessageFlags.IsComponentsV2,
    });
  },
};

export default command;
