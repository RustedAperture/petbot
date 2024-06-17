const { ContextMenuCommandBuilder, PermissionsBitField, ApplicationCommandType } = require("discord.js");
const { log } = require("../../utilities/log");
const { botData } = require('./../../utilities/db');

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
				guild_id: guild
			} 
		});
		const logChannel = await interaction.guild.channels.fetch(
			guildSettings.get("log_channel")
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
