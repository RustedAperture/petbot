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
		const log_channel = interaction.options.getChannel("log_channel");
		const default_pet = interaction.options.getString("default_pet");

		let setupEmbed = new EmbedBuilder().setTitle("Setup");

		const botRead = await fs.readFile("data/bot_settings.json", "utf-8");
		const botData = JSON.parse(botRead);

		if (!botData.hasOwnProperty(interaction.guildId)) {
			botData[interaction.guildId] = {
				nickname: "",
				log_channel: "",
				default_pet: "",
			};
		}

		if (nickname != null) {
			botData[interaction.guildId]["nickname"] = `${nickname}`;
			setupEmbed.addFields({ name: "Nickname", value: nickname });
			const botId = interaction.client.application.id;
			const bot = await interaction.guild.members.fetch(botId);
			bot.setNickname(nickname);
		}
		if (log_channel != null) {
			botData[interaction.guildId]["log_channel"] = `${log_channel.id}`;
			setupEmbed.addFields({
				name: "Log Channel",
				value: `<#${log_channel.id}>`,
			});
		}
		if (default_pet != null) {
			botData[interaction.guildId]["default_pet"] = `${default_pet}`;
			setupEmbed.addFields({ name: "Default Image", value: default_pet });
		}

		setupEmbed.addFields({
			name: "Triggered by",
			value: `<@${interaction.member.id}>`,
		});

		log_channel.send({ embeds: [setupEmbed] });

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
