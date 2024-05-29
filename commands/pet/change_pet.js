const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const fs = require("fs").promises;
const { log } = require("../../utilities/log");
const botData = require("../../data/bot_settings.json");
const { checkUser } = require("../../utilities/check_user");
const { checkImage } = require("../../utilities/check_image");

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
		const channel = await interaction.guild.channels.fetch(
			botData[guild]["log_channel"]
		);

		await checkUser(target, guild);

		const petRead = await fs.readFile("data/pet_data.json", "utf-8");
		const petData = JSON.parse(petRead);

		if (interaction.options.getSubcommand() === "update") {
			const url = interaction.options.getString("url");
			if (await checkImage(url)) {
				petData[guild][target.id]["url"] = url;
				await fs.writeFile(
					"data/pet_data.json",
					JSON.stringify(petData, null, 2),
					"utf-8"
				);
				await interaction.reply({
					content: "Updated your image to the new url",
					ephemeral: true,
				});
				let log_msg = `${target.displayName} pet image has been updated.`;
				await log(
					"Updated Pet Image",
					log_msg,
					channel,
					`<@${interaction.member.id}>`,
					url
				);
			} else {
				await interaction.reply({
					content: "Your URL is invalid, please try again",
					ephemeral: true,
				});
			}
		} else if (interaction.options.getSubcommand() === "remove") {
			petData[guild][target.id]["url"] = botData[guild]["default_pet"];
			await fs.writeFile(
				"data/pet_data.json",
				JSON.stringify(petData, null, 2),
				"utf-8"
			);
			await interaction.reply({
				content: "Reset image to default image",
				ephemeral: true,
			});
			let log_msg = `${target.displayName} pet image has been reset`;
			await log(
				"Updated Pet Image",
				log_msg,
				channel,
				`<@${interaction.member.id}>`,
				botData[guild]["default_pet"]
			);
		}
	},
};
