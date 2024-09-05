const {
	SlashCommandBuilder,
	ApplicationIntegrationType,
	InteractionContextType,
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
		)
		.setIntegrationTypes([
			ApplicationIntegrationType.GuildInstall,
			ApplicationIntegrationType.UserInstall,
		])
		.setContexts([
			InteractionContextType.BotDM,
			InteractionContextType.Guild,
			InteractionContextType.PrivateChannel,
		]),
	async execute(interaction) {
		let guild, target;
		let inServer = interaction.guild;

		if (interaction.context == 0 && inServer != null) {
			guild = interaction.guildId;
			target = interaction.member;
		} else if (inServer == null) {
			guild = interaction.guildId;
			target = interaction.user;
		} else {
			guild = interaction.channelId;
			target = interaction.user;
		}

		await checkUser(target, guild, interaction);

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
		}
	},
};
