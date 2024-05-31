const {
	SlashCommandBuilder,
	PermissionsBitField,
	EmbedBuilder,
} = require("discord.js");
const fs = require("fs").promises;

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
				.setName("logChannel")
				.setDescription("The Channel that the bot should log too")
				.setRequired(false)
		)
		.addChannelOption((option) =>
			option
				.setName("oocChannel")
				.setDescription("The Channel that the bot should post out of context messages too")
				.setRequired(false)
		)
		.addStringOption((option) =>
			option
				.setName("defaultPet")
				.setDescription(
					"The URL for the default pet emoji, used when a user doesnt have one already."
				)
				.setRequired(false)
		)
		.setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator),
	async execute(interaction) {
		const nickname = interaction.options.getString("nickname");
		const logChannel = interaction.options.getChannel("logChannel");
		const oocChannel = interaction.options.getChannel("oocChannel");
		const defaultPet = interaction.options.getString("defaultPet");

		let setupEmbed = new EmbedBuilder().setTitle("Setup");

		const botRead = await fs.readFile("data/bot_settings.json", "utf-8");
		const botData = JSON.parse(botRead);

		if (!botData.hasOwnProperty(interaction.guildId)) {
			botData[interaction.guildId] = {
				nickname: "",
				logChannel: "",
				defaultPet: "",
			};
		}

		if (nickname != null) {
			botData[interaction.guildId]["nickname"] = `${nickname}`;
			setupEmbed.addFields({ name: "Nickname", value: nickname });
			const botId = interaction.client.application.id;
			const bot = await interaction.guild.members.fetch(botId);
			bot.setNickname(nickname);
		}
		if (logChannel != null) {
			botData[interaction.guildId]["log_channel"] = `${logChannel.id}`;
			setupEmbed.addFields({
				name: "Log Channel",
				value: `<#${logChannel.id}>`,
			});
		}
		if (oocChannel != null) {
			botData[interaction.guildId]["ooc"] = `${oocChannel.id}`;
			setupEmbed.addFields({
				name: "OOC Channel",
				value: `<#${oocChannel.id}>`,
			});
		}
		if (defaultPet != null) {
			botData[interaction.guildId]["default_pet"] = `${defaultPet}`;
			setupEmbed.addFields({ name: "Default Image", value: defaultPet });
		}

		setupEmbed.addFields({
			name: "Triggered by",
			value: `<@${interaction.member.id}>`,
		});

		logChannel.send({ embeds: [setupEmbed] });

		interaction.reply({
			content: "Updated Configs. This has been logged.",
			ephemeral: true,
		});

		await fs.writeFile(
			"data/bot_settings.json",
			JSON.stringify(botData, null, 2),
			"utf-8"
		);
	},
};
