const { Events } = require("discord.js");
const { resetPet } = require("../utilities/reset-pet");
const logger = require("../logger");

module.exports = {
	name: Events.InteractionCreate,
	async execute(interaction) {
		if (
			interaction.isChatInputCommand() ||
			interaction.isUserContextMenuCommand() ||
			interaction.isMessageContextMenuCommand()
		) {
			const command = interaction.client.commands.get(
				interaction.commandName
			);

			if (!command) {
				console.error(
					`No command matching ${interaction.commandName} was found.`
				);
				return;
			}

			try {
				await command.execute(interaction);
			} catch (error) {
				console.error(error);
				if (interaction.replied || interaction.deferred) {
					await interaction.followUp({
						content:
							"There was an error while executing this command!",
						ephemeral: true,
					});
				} else {
					await interaction.reply({
						content:
							"There was an error while executing this command!",
						ephemeral: true,
					});
				}
			}
		} else if (interaction.isButton()) {
			if (interaction.customId === "reset-pet") {
				await interaction.deferReply({ ephemeral: true });
				const msg = await interaction.message;
				const mention = msg.embeds[0].fields[0]["value"].replace(
					/<@!?|>/g,
					""
				);
				const slot = parseInt(
					msg.embeds[0].description.match(/image (\d+)/)[1]
				);
				resetPet(interaction, mention, slot);
				msg.edit({ components: [] });
				await interaction.editReply({
					content: `${mention} has been reset`,
				});
			}
		} else if (interaction.isStringSelectMenu()) {
			// respond to the select menu
		}
	},
};
