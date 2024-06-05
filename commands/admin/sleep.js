const { ContextMenuCommandBuilder, PermissionsBitField, ApplicationCommandType } = require("discord.js");
const { log } = require("../../utilities/log");
const botData = require("../../data/bot_settings.json");

module.exports = {
	data: new ContextMenuCommandBuilder()
		.setName("sleep")
		.setType(ApplicationCommandType.User)
		.setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator),
	async execute(interaction) {
		let target = await interaction.options.getMember("target");
		const guild = interaction.guildId;
		const logChannel = await interaction.guild.channels.fetch(
			botData[guild]["log_channel"]
		);

        target.timeout(2 * 60 * 60 * 1000, 'Sleepy Time')

		const logMsg = `<@${target.id}> has been put to sleep!`;

		await log(
			"User put to sleep!",
			logMsg,
			logChannel,
			`<@${interaction.member.id}>`
		);
		interaction.reply({ content: logMsg, ephemeral: true });
	},
};
