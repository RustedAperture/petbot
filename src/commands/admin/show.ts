import {
  SlashCommandBuilder,
  PermissionsBitField,
  MessageFlags,
} from "discord.js";
import { log } from "../../utilities/log.js";
import { BotData } from "../../utilities/db.js";
import { emitCommand } from "../../utilities/metrics.js";

export const command = {
  data: new SlashCommandBuilder()
    .setName("show")
    .setDescription("Reveals a channel from a specific user")
    .addUserOption((option) =>
      option
        .setName("target")
        .setDescription("The user you want to hide channel from")
        .setRequired(false),
    )
    .addChannelOption((option) =>
      option
        .setName("channel")
        .setDescription("The channel you want to hide")
        .setRequired(false),
    )
    .addStringOption((option) =>
      option
        .setName("reason")
        .setDescription("The reason you are hiding")
        .setRequired(false),
    )
    .setDefaultMemberPermissions(PermissionsBitField.Flags.ModerateMembers),
  async execute(interaction: any) {
    emitCommand("show");
    let channel = interaction.options.getChannel("channel");
    let target = interaction.options.getMember("target");
    let reason = interaction.options.getString("reason");
    const guild = interaction.guildId;
    const guildSettings = await BotData.findOne({
      where: {
        guild_id: guild,
      },
    });
    const logChannel = await interaction.guild.channels.fetch(
      guildSettings!.get("log_channel"),
    );

    if (!channel) {
      channel = interaction.channel;
    }

    if (!target) {
      target = interaction.member;
    }

    if (!reason) {
      reason = "None";
    }

    const logMsg = `> **User**: ${
      interaction.options.getUser("target").username
    } (<@${target.id}>)
		> **Channel**: <#${channel.id}>
		> **Reason**: ${reason}`;

    channel.permissionOverwrites.create(target, { ViewChannel: true });

    await log(
      "Channel now visible for user!",
      logMsg,
      logChannel,
      interaction.user,
      undefined,
      null,
      [0, 128, 0] as any,
    );

    interaction.reply({ content: logMsg, flags: MessageFlags.Ephemeral });
  },
};

export default command;
