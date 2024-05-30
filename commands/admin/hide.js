const { SlashCommandBuilder, PermissionsBitField } = require("discord.js");
const { log } = require("../../utilities/log");
const botData = require("../../data/bot_settings.json");

module.exports = {
	data: new SlashCommandBuilder()
		.setName("hide")
		.setDescription("Hides a channel from a specific user")
		.addUserOption((option) =>
			option
				.setName("target")
				.setDescription("The user you want to hide channel from")
				.setRequired(false)
		)
		.addChannelOption((option) =>
			option
				.setName("channel")
				.setDescription("The channel you want to hide")
				.setRequired(false)
		)
		.addStringOption((option) =>
			option
				.setName("reason")
				.setDescription("The reason you are hiding")
				.setRequired(false)
		)
		.setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator),
	async execute(interaction) {
		let channel = interaction.options.getChannel("channel");
		let target = interaction.options.getMember("target");
		let reason = interaction.options.getString("reason");
		const guild = interaction.guildId;
		const logChannel = await interaction.guild.channels.fetch(
			botData[guild]["log_channel"]
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

		const logMsg = `<#${channel.id}> has been hidden from <@${target.id}>`;

		channel.permissionOverwrites.create(target, { ViewChannel: false });

		await log(
			"Channel Permission Update!",
			logMsg,
			logChannel,
			`<@${interaction.member.id}>`,
			undefined,
			reason
		);
		interaction.reply({ content: logMsg, ephemeral: true });
	},
};
