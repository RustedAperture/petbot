const {
	SlashCommandBuilder,
	ApplicationIntegrationType,
	InteractionContextType,
} = require("discord.js");
const { checkUser } = require("../../utilities/check_user");
const { checkImage } = require("../../utilities/check_image");
const { resetPet } = require("../../utilities/reset-pet");
const { updatePet } = require("../../utilities/update-pet");
const logger = require("../../logger");
const { petData, botData } = require("../../utilities/db");

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
				.addNumberOption((option) =>
					option
						.setName("slot")
						.setDescription(
							"1-4 These are your slots, if left undefined then it will default to 1"
						)
						.setRequired(true)
						.addChoices(
							{ name: "1", value: 1 },
							{ name: "2", value: 2 },
							{ name: "3", value: 3 },
							{ name: "4", value: 4 }
						)
				)
				.addBooleanOption((option) =>
					option
						.setName("everywhere")
						.setDescription("Update your image everywhere")
				)
		)
		.addSubcommand((subcommand) =>
			subcommand
				.setName("remove")
				.setDescription("Remove your users pet image.")
				.addNumberOption((option) =>
					option
						.setName("slot")
						.setDescription(
							"1-4 These are your slots, if left undefined then it will default to 1"
						)
						.setRequired(true)
						.addChoices(
							{ name: "1", value: 1 },
							{ name: "2", value: 2 },
							{ name: "3", value: 3 },
							{ name: "4", value: 4 }
						)
				)
				.addBooleanOption((option) =>
					option
						.setName("everywhere")
						.setDescription("Reset your image everywhere")
				)
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
		let target = interaction.user;
		let everywhere = interaction.options.getBoolean("everywhere");
		let slot = interaction.options.getNumber("slot");

		let guild = interaction.guildId ?? interaction.channelId;

		await checkUser(target, guild);

		if (interaction.options.getSubcommand() === "update") {
			const url = interaction.options.getString("url");

			// check slot 1 if trying to set a higher slot before slot 1
			if (slot >= 2) {
				// get guild default pet
				const guildSettings = await botData.findOne({
					where: {
						guild_id: guild,
					},
				});
				const defaultBase =
					"https://github.com/RustedAperture/Stickers/blob/main/Belly%20Rub%202.0/belly%20rub-base.png?raw=true";
				// check slot one for default
				const pet = await petData.findOne({
					where: {
						user_id: target.id,
						guild_id: guild,
					},
				});
				if (
					pet.pet_img == defaultBase ||
					pet.pet_img == guildSettings?.get("default_pet_image")
				) {
					logger.debug("setting image while slot 1 is default");
					slot = 1;
				}
			}

			if (await checkImage(url)) {
				await updatePet(
					interaction,
					target.id,
					url,
					everywhere,
					null,
					slot
				);
			} else {
				await interaction.reply({
					content: "Your URL is invalid, please try again",
					ephemeral: true,
				});
			}
		} else if (interaction.options.getSubcommand() === "remove") {
			await resetPet(interaction, target.id, slot);
			await interaction.reply({
				content: `Your image in slot ${slot} has been reset to the base image.`,
				ephemeral: true,
			});
		}
	},
};
