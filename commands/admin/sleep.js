const {
	ContextMenuCommandBuilder,
	PermissionsBitField,
	ApplicationCommandType,
	EmbedBuilder,
} = require("discord.js");
const { log } = require("../../utilities/log");
const { botData } = require("./../../utilities/db");

module.exports = {
	data: new ContextMenuCommandBuilder()
		.setName("sleep")
		.setType(ApplicationCommandType.User)
		.setDefaultMemberPermissions(PermissionsBitField.Flags.ModerateMembers),
	async execute(interaction) {
		const target = interaction.targetMember;
		const guild = interaction.guildId;
		const guildSettings = await botData.findOne({
			where: {
				guild_id: guild,
			},
		});
		const logChannel = await interaction.guild.channels.fetch(
			guildSettings.get("log_channel")
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
			.setImage(guildSettings.get("sleep_image"));

		await log(
			"User put to sleep!",
			logMsg,
			logChannel,
			interaction.user,
			null,
			null,
			"Blue"
		);

		interaction.reply({ embeds: [sleepEmbed] });
	},
};
