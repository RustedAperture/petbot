const { SlashCommandBuilder, PermissionsBitField } = require("discord.js");
const { checkUser } = require("../../utilities/check_user");
const { checkImage } = require("../../utilities/check_image");
const { updatePet } = require("../../utilities/update-pet");
const { botData } = require("./../../utilities/db");

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
		.setDefaultMemberPermissions(PermissionsBitField.Flags.ModerateMembers),
	async execute(interaction) {
		const target = interaction.options.getMember("target");

		let reason = interaction.options.getString("reason");
		let url = interaction.options.getString("url");

		const guild = interaction.guildId;

		const guildSettings = await botData.findOne({
			where: {
				guild_id: guild,
			},
		});

		if (!reason) {
			reason = "None";
		}

		if (url == "default") {
			url = guildSettings.get("default_pet_image");
		}

		await checkUser(target, guild, interaction);

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
