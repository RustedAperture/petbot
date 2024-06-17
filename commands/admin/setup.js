const {
	SlashCommandBuilder,
	PermissionsBitField,
	EmbedBuilder,
} = require("discord.js");
const { botData } = require('./../../utilities/db');

module.exports = {
	data: new SlashCommandBuilder()
		.setName("setup")
		.setDescription("sets the bot up")
		.addStringOption((option) =>
			option
				.setName("nickname")
				.setDescription("The nickname for the bot")
				.setRequired(false)
		)
		.addChannelOption((option) =>
			option
				.setName("log_channel")
				.setDescription("The Channel that the bot should log too")
				.setRequired(false)
		)
		.addStringOption((option) =>
			option
				.setName("default_pet")
				.setDescription(
					"The URL for the default pet emoji, used when a user doesnt have one already."
				)
				.setRequired(false)
		)
		.setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator),
	async execute(interaction) {
		const nickname = interaction.options.getString("nickname");
		const defaultPet = interaction.options.getString("default_pet");
		const guildSettings = await botData.findOne({
			where: { 
				guild_id: interaction.guildId
			} 
		});

		let logChannel = interaction.options.getChannel("log_channel");

		let setupEmbed = new EmbedBuilder().setTitle("Setup");

		if (!guildSettings) {
			await botData.create({
				guild_id: interaction.guildId,
				default_pet_image: "",
				log_channel: "",
				nickname: ""
			});
		}

		if (!logChannel) {
			try {
				logChannel = await interaction.guild.channels.fetch(
					guildSettings.get("log_channel")
				);
			}
			catch {
				console.log("No log channel has been setup yet!")
			}
		}

		if (nickname != null) {
			const affectedRows = await botData.update({ nickname: nickname }, { where: { guild_id: interaction.guildId } });

			if (affectedRows > 0) {
				console.log(`Updated nickname of bot for guild: ${interaction.guildId}`)
				setupEmbed.addFields({ name: "Nickname", value: nickname })
			}

			const botId = interaction.client.application.id;
			const bot = await interaction.guild.members.fetch(botId);
			bot.setNickname(nickname);
		}
		if (logChannel != null) {
			const affectedRows = await botData.update({ log_channel: logChannel.id }, { where: { guild_id: interaction.guildId } });

			if (affectedRows > 0) {
				console.log(`Updated log channel of bot for guild: ${interaction.guildId}`)
				setupEmbed.addFields({
					name: "Log Channel",
					value: `<#${logChannel.id}>`,
				});
			}
		}
		if (defaultPet != null) {
			const affectedRows = await botData.update({ default_pet_image: defaultPet }, { where: { guild_id: interaction.guildId } });

			if (affectedRows > 0) {
				console.log(`Updated default image of bot for guild: ${interaction.guildId}`)
				setupEmbed.addFields({ name: "Default Image", value: defaultPet });
			}
		}

		setupEmbed.addFields({
			name: "Triggered by",
			value: `<@${interaction.member.id}>`,
		});

		try {
			logChannel.send({ embeds: [setupEmbed] });
			interaction.reply({
				content: "Updated Configs. This has been logged.",
				ephemeral: true,
			});
		}
		catch {
			interaction.reply({
				content: "No log channel has been set yet.",
				ephemeral: true,
			});
		}
	},
};
