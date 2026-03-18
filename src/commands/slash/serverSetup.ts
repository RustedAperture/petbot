import {
  SlashCommandBuilder,
  PermissionsBitField,
  ModalBuilder,
  LabelBuilder,
  TextInputStyle,
  TextInputBuilder,
  ChannelSelectMenuBuilder,
  StringSelectMenuBuilder,
} from "discord.js";

import { drizzleDb } from "../../db/connector.js";
import { botData } from "../../db/schema.js";
import { eq } from "drizzle-orm";
import { GuildSettings } from "../../types/guild.js";

export const command = {
  data: new SlashCommandBuilder()
    .setName("server-setup")
    .setDescription("Setup a bot when added to a guild")
    .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator),
  async execute(interaction: any) {
    const gsRows: GuildSettings[] = await drizzleDb
      .select()
      .from(botData)
      .where(eq(botData.guildId, interaction.guildId))
      .limit(1);

    const guildSettings = gsRows?.[0] ?? null;

    const modal = new ModalBuilder()
      .setCustomId("server-setup-modal")
      .setTitle("Setup PetBot for this server");

    const nicknameInput = new TextInputBuilder()
      .setCustomId("nicknameInput")
      .setStyle(TextInputStyle.Short)
      .setPlaceholder("PetBot")
      .setValue(guildSettings?.nickname || "")
      .setRequired(false)
      .setMaxLength(30)
      .setMinLength(1);

    const nicknameLabel = new LabelBuilder()
      .setLabel("What should I call myself? (optional)")
      .setDescription(
        'Name shown in the users list and chat. If left blank, I will use my default name "PetBot".',
      )
      .setTextInputComponent(nicknameInput);

    const logChannelSelect = new ChannelSelectMenuBuilder()
      .setCustomId("logChannelSelect")
      .setChannelTypes([0])
      .setPlaceholder("Select a log channel");

    if (guildSettings?.logChannel) {
      logChannelSelect.setDefaultChannels(guildSettings.logChannel);
    }

    const logChannelLabel = new LabelBuilder()
      .setLabel("Where should I send log messages?")
      .setDescription(
        "Optional channel ID/mention where I'll post moderation/log events. Leave blank to skip logging.",
      )
      .setChannelSelectMenuComponent(logChannelSelect);

    const sleepImageInput = new TextInputBuilder()
      .setCustomId("sleepImageInput")
      .setStyle(TextInputStyle.Short)
      .setPlaceholder("https://example.com/sleep-image.png")
      .setValue(guildSettings?.sleepImage || "")
      .setRequired(false);

    const sleepImageLabel = new LabelBuilder()
      .setLabel("Sleep Image URL")
      .setDescription(
        "Optional URL to use for the /sleep command. If left blank, a default image will be used.",
      )
      .setTextInputComponent(sleepImageInput);

    const restrictedEnabled = Boolean(guildSettings?.restricted);

    const restrictedSelect = new StringSelectMenuBuilder()
      .setCustomId("restrictedSelect")
      .setPlaceholder("Enable restricted mode?")
      .addOptions(
        {
          label: "Yes",
          value: "true",
          description:
            "Only use server-default images when responding; ignore users’ custom images.",
          default: restrictedEnabled,
        },
        {
          label: "No",
          value: "false",
          description:
            "Allow users to use their own images (default behavior).",
          default: !restrictedEnabled,
        },
      );

    const restrictedLabel = new LabelBuilder()
      .setLabel("Enable Restricted Mode?")
      .setDescription("Restrict PetBot to images set by the server.")
      .setStringSelectMenuComponent(restrictedSelect);

    modal.addLabelComponents(nicknameLabel);
    modal.addLabelComponents(logChannelLabel);
    modal.addLabelComponents(sleepImageLabel);
    modal.addLabelComponents(restrictedLabel);

    await interaction.showModal(modal);
  },
};

export default command;
