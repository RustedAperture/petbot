import {
  ContextMenuCommandBuilder,
  ApplicationCommandType,
  ApplicationIntegrationType,
  InteractionContextType,
  ModalBuilder,
  GuildMember,
  User,
  LabelBuilder,
  StringSelectMenuBuilder,
} from "discord.js";
import { emitCommand } from "../../utilities/metrics.js";
import { ACTIONS } from "../../types/constants.js";

export const command = {
  data: new ContextMenuCommandBuilder()
    .setName("perform")
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
  aliases: ["perform-user"],
  async execute(interaction: any) {
    emitCommand("perform-user");

    const inServer = interaction.guild;
    let target: GuildMember | User;

    if (interaction.context === 0 && inServer != null) {
      target = interaction.targetMember!;
    } else {
      target = interaction.targetUser!;
    }

    const modal = new ModalBuilder()
      .setCustomId(`perform-modal:${target.id}`)
      .setTitle("Perform an action");

    const selectMenu = new LabelBuilder()
      .setLabel("Action")
      .setStringSelectMenuComponent(
        new StringSelectMenuBuilder()
          .setCustomId("action")
          .setPlaceholder("Select an action")
          .addOptions(
            Object.keys(ACTIONS).map((k) => ({ label: k, value: k })) as any,
          ),
      );

    modal.addLabelComponents(selectMenu);

    await interaction.showModal(modal);
  },
};

export default command;
