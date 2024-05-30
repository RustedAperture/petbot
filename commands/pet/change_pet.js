const {
	SlashCommandBuilder,
} = require("discord.js");
const { checkUser } = require("../../utilities/check_user");
const { checkImage } = require("../../utilities/check_image");
const { resetPet } = require("../../utilities/reset-pet");
const { updatePet } = require("../../utilities/update-pet");

module.exports = {
	data: new SlashCommandBuilder()
		.setName("change-pet")
		.setDescription("Update your pet settings")
		.addSubcommand((subcommand) =>
			subcommand
				.setName("update")
				.setDescription("Update your users pet image.")
				.addStringOption((option) =>
					option
						.setName("url")
						.setDescription(
							"The url of the image that you would like to use"
						)
						.setRequired(true)
				)
		)
		.addSubcommand((subcommand) =>
			subcommand
				.setName("remove")
				.setDescription("Remove your users pet image.")
		),
	async execute(interaction) {
		const guild = interaction.guildId;
		const target = interaction.member;

		await checkUser(target, guild);

		if (interaction.options.getSubcommand() === "update") {
			const url = interaction.options.getString("url");
			if (await checkImage(url)) {
				await updatePet(interaction, target.id, url);
			} else {
				await interaction.reply({
					content: "Your URL is invalid, please try again",
					ephemeral: true,
				});
			}
		} else if (interaction.options.getSubcommand() === "remove") {
			await resetPet(interaction, target.id);
			await interaction.reply({
				content: "Reset image to default image",
				ephemeral: true,
			});
		}
	},
};
