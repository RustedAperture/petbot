import {
  ContextMenuCommandBuilder,
  PermissionsBitField,
  ApplicationCommandType,
  EmbedBuilder,
} from "discord.js";
import { log } from "../../utilities/log.js";
import { BotData } from "../../utilities/db.js";
import { emitCommand } from "../../utilities/metrics.js";

export const command = {
  data: new ContextMenuCommandBuilder()
    .setName("sleep")
    .setType(ApplicationCommandType.User)
    .setDefaultMemberPermissions(PermissionsBitField.Flags.ModerateMembers),
  async execute(interaction: any) {
    emitCommand("sleep");
    const target = interaction.targetMember;
    const guild = interaction.guildId;
    const guildSettings = await BotData.findOne({
      where: {
        guild_id: guild,
      },
    });
    const logChannel = await interaction.guild.channels.fetch(
      guildSettings!.get("log_channel"),
    );

    target.timeout(2 * 60 * 60 * 1000, "Sleepy Time");

    const logMsg = `> **User**: ${interaction.targetUser.username} (<@${target.id}>)`;

    const sleepEmbed = new EmbedBuilder()
      .setColor(target.displayHexColor)
      .setTitle(`${target.displayName} has been put to sleep!`)
      .setAuthor({
        name: interaction.member.displayName,
        iconURL: interaction.member.displayAvatarURL(),
      })
      .setImage(guildSettings!.get("sleep_image"));

    await log(
      "User put to sleep!",
      logMsg,
      logChannel,
      interaction.user,
      null,
      null,
      [0, 0, 255] as any,
    );

    interaction.reply({ embeds: [sleepEmbed] });
  },
};

export default command;
