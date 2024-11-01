const { SlashCommandBuilder, PermissionsBitField } = require("discord.js");
const { log } = require("../../utilities/log");
const { botData } = require("./../../utilities/db");

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
		.setDefaultMemberPermissions(PermissionsBitField.Flags.ModerateMembers),
	async execute(interaction) {
		let channel = interaction.options.getChannel("channel");
		let target = interaction.options.getMember("target");
		let reason = interaction.options.getString("reason");
		const guild = interaction.guildId;
		const guildSettings = await botData.findOne({
			where: {
				guild_id: guild,
			},
		});
		const logChannel = await interaction.guild.channels.fetch(
			guildSettings.get("log_channel")
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

		channel.permissionOverwrites.create(target, { ViewChannel: false });

		await log(
			"Channel now hidden for user!",
			logMsg,
			logChannel,
			interaction.user,
			null,
			null,
			"Red"
		);

		interaction.reply({ content: logMsg, ephemeral: true });
	},
};
