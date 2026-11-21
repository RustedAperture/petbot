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
import { resolveAvailableActions } from "../../utilities/customActions/resolver.js";
import { actionChoiceLabel } from "../actionAutocomplete.js";
import { buildActionContextFor } from "../../utilities/customActions/context.js";
import { isOptedOut } from "../../utilities/check_user.js";
import { MessageFlags } from "discord.js";

const MAX_OPTIONS = 25;

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
    const targetUserId: string | undefined = interaction.targetUser?.id;
    if (targetUserId && (await isOptedOut(targetUserId))) {
      await interaction.reply({
        content:
          "That user has opted out of PetBot and cannot be interacted with.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

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

    const ctx = await buildActionContextFor({
      guildId: interaction.guildId,
      channelId: interaction.channelId,
      authorId: interaction.user.id,
      targetId: target.id,
      client: interaction.client,
    });
    const targetName = target.displayName;
    const options = (await resolveAvailableActions(ctx))
      .slice(0, MAX_OPTIONS)
      .map((a) => ({
        label: actionChoiceLabel(a, interaction.user.id, target.id, targetName),
        value: a.name,
      }));

    const selectMenu = new LabelBuilder()
      .setLabel("Action")
      .setStringSelectMenuComponent(
        new StringSelectMenuBuilder()
          .setCustomId("action")
          .setPlaceholder("Select an action")
          .addOptions(options),
      );

    modal.addLabelComponents(selectMenu);

    await interaction.showModal(modal);
  },
};

export default command;
