const { SlashCommandBuilder, PermissionsBitField } = require("discord.js");
const { checkUser } = require("../../utilities/check_user");
const { checkImage } = require("../../utilities/check_image");
const { updatePet } = require("../../utilities/update-pet");

module.exports = {
	data: new SlashCommandBuilder()
		.setName("set-pet")
		.setDescription("Sets a pet for a specific user")
		.addUserOption((option) =>
			option
				.setName("target")
				.setDescription("The user you want to change")
				.setRequired(true)
		)
		.addStringOption((option) =>
			option
				.setName("url")
				.setDescription("The url of the image")
				.setRequired(true)
		)
		.addStringOption((option) =>
			option
				.setName("reason")
				.setDescription("The reason for changing the image")
				.setRequired(false)
		)
		.setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator),
	async execute(interaction) {
		const target = interaction.options.getMember("target");

		let reason = interaction.options.getString("reason");
		let url = interaction.options.getString("url");

		const guild = interaction.guildId;

		if (!reason) {
			reason = "None";
		}

		if (url == "default") {
			url = botdata[guild]["default_pet"];
		}

		await checkUser(target, guild);

		if (await checkImage(url)) {
			await updatePet(interaction, target, url, reason);
		} else {
			await interaction.reply({
				content: `Invalid url please try again.`,
				ephemeral: true,
			});
		}
	},
};
