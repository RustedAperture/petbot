const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { petData, botData } = require("./../../utilities/db");

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
				guild_id: guild,
			},
		});

		if (!pet) {
			await interaction.reply({
				content: "The user has no pet data",
				ephemeral: true,
			});
		} else {
			const petEmbed = new EmbedBuilder()
				.setColor(target.displayHexColor)
				.setAuthor({
					name: target.displayName,
					iconURL: target.displayAvatarURL(),
				})
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
					},
					{
						name: "Pet Images",
						value: "These are the images for the specified user.",
					}
				)
				.setURL("https://discord.js")
				.setImage(`${pet.get("pet_img")}`);

			let petEmbed2, petEmbed3, petEmbed4;

			if (pet.pet_img_two != null) {
				petEmbed2 = new EmbedBuilder()
					.setURL("https://discord.js")
					.setImage(`${pet.get("pet_img_two")}`);
			} else {
				petEmbed2 = new EmbedBuilder()
					.setURL("https://discord.js")
					.setImage(
						"https://github.com/RustedAperture/Stickers/blob/main/belly%20placeholder.png?raw=true"
					);
			}

			if (pet.pet_img_three != null) {
				petEmbed3 = new EmbedBuilder()
					.setURL("https://discord.js")
					.setImage(`${pet.get("pet_img_three")}`);
			} else {
				petEmbed3 = new EmbedBuilder()
					.setURL("https://discord.js")
					.setImage(
						"https://github.com/RustedAperture/Stickers/blob/main/belly%20placeholder.png?raw=true"
					);
			}

			if (pet.pet_img_four != null) {
				petEmbed4 = new EmbedBuilder()
					.setURL("https://discord.js")
					.setImage(`${pet.get("pet_img_four")}`);
			} else {
				petEmbed4 = new EmbedBuilder()
					.setURL("https://discord.js")
					.setImage(
						"https://github.com/RustedAperture/Stickers/blob/main/belly%20placeholder.png?raw=true"
					);
			}

			await interaction.reply({
				embeds: [petEmbed, petEmbed2, petEmbed3, petEmbed4],
				ephemeral: true,
			});
		}
	},
};
