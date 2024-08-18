const {
	ContextMenuCommandBuilder,
	PermissionsBitField,
	ApplicationCommandType,
} = require("discord.js");
const { log } = require("../../utilities/log");
const { botData } = require("./../../utilities/db");

module.exports = {
	data: new ContextMenuCommandBuilder()
		.setName("sleep")
		.setType(ApplicationCommandType.User)
		.setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator),
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

		const logMsg = `<@${target.id}> has been put to sleep!`;

		const sleepEmbed = new EmbedBuilder()
			.setColor(target.displayHexColor)
			.setTitle(logMsg)
			.setAuthor({
				name: author.displayName,
				iconURL: author.displayAvatarURL(),
			})
			.setImage(guildSettings.get("sleep_image"));

		await log(
			"User put to sleep!",
			logMsg,
			logChannel,
			`<@${interaction.member.id}>`
		);

		interaction.reply({ content: logMsg, embeds: [sleepEmbed] });
	},
};
