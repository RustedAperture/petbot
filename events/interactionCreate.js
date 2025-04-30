const { Events, MessageFlags, ContainerBuilder } = require("discord.js");
const { resetPet } = require("../utilities/reset-pet");
const logger = require("../logger");
const { log } = require("../utilities/log");

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
						flags: MessageFlags.Ephemeral,
					});
				} else {
					await interaction.reply({
						content:
							"There was an error while executing this command!",
						flags: MessageFlags.Ephemeral,
					});
				}
			}
		} else if (interaction.isButton()) {
			if (interaction.customId === "reset-pet") {
				await interaction.deferReply({ flags: MessageFlags.Ephemeral });
				const msg = await interaction.message;
				const msgDesc = msg.components[0].components[1].content;
				const mention = msgDesc.match(/<@(\d+)>/)[1];
				// Split the string by newline characters
				const lines = msgDesc.split("\n")[1];
				// Extract the number after "Slot:"
				const slotNumber = parseInt(lines.trim().split(":")[1].trim());
				resetPet(interaction, mention, slotNumber);
				await interaction.editReply({
					content: `<@${mention}> pet image has been reset`,
				});
			}
		} else if (interaction.isStringSelectMenu()) {
			// respond to the select menu
		}
	},
};
