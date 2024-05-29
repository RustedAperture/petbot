const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const fs = require("fs").promises;

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
		const data = await fs.readFile("data/pet_data.json", "utf-8");
		const petdata = JSON.parse(data);
		const guild = interaction.guildId;

		let target = interaction.options.getMember("target");
		if (!target) {
			target = interaction.member;
		}

		if (!petdata[guild].hasOwnProperty(target.id)) {
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
						value: `${petdata[guild][target.id]["has_been_pet"]}x`,
						inline: true,
					},
					{
						name: "Used pet",
						value: `${petdata[guild][target.id]["has_pet"]}x`,
						inline: true,
					}
				);

			await interaction.reply({ embeds: [petEmbed], ephemeral: true });
		}
	},
};
