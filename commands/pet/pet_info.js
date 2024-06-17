const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { petData, botData } = require('./../../utilities/db');

module.exports = {
	data: new SlashCommandBuilder()
		.setName("pet-stats")
		.setDescription("Get the stats for a user")
		.addUserOption((option) =>
			option
				.setName("target")
				.setDescription("The user you want to get pet stats for")
				.setRequired(false)
		),
	async execute(interaction) {
		const guild = interaction.guildId;

		let target = interaction.options.getMember("target");
		if (!target) {
			target = interaction.member;
		}

		const pet = await petData.findOne({
			where: { 
				user_id: target.id,
				guild_id: guild
			} 
		});

		if (!pet) {
			await interaction.reply({
				content: "The user has no pet data",
				ephemeral: true,
			});
		} else {
			const petEmbed = new EmbedBuilder()
				.setColor(target.displayHexColor)
				.setTitle(target.displayName)
				.setThumbnail(target.displayAvatarURL())
				.addFields(
					{
						name: "Has been pet",
						value: `${pet.get("has_been_pet")}x`,
						inline: true,
					},
					{
						name: "Used pet",
						value: `${pet.get("has_pet")}x`,
						inline: true,
					}
				);

			await interaction.reply({ embeds: [petEmbed], ephemeral: true });
		}
	},
};
