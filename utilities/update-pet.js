const { ButtonStyle, ButtonBuilder, ActionRowBuilder, MessageFlags } = require("discord.js");
const { botData, petData } = require("./db");
const { log } = require("./log");
const logger = require("../logger");
const { getPetSlot } = require("./helper");

exports.updatePet = async (
	interaction,
	userId,
	url,
	everywhere = false,
	reason = null,
	slot
) => {
	let guildSettings, logChannel;
	let inServer = interaction.guild;
	let loggermsg;
	let petSlot = getPetSlot(slot);
	let target = interaction.user;

	let guild = interaction.guildId ?? interaction.channelId;

	if (interaction.context == 0 && inServer != null) {
		guildSettings = await botData.findOne({
			where: {
				guild_id: guild,
			},
		});
		logChannel = await interaction.guild.channels.fetch(
			guildSettings.get("log_channel")
		);
	}

	const cmd = interaction.commandName;

	try {
		if (everywhere) {
			await petData.update(
				{
					[petSlot]: url,
				},
				{
					where: {
						user_id: userId,
					},
				}
			);
		} else {
			await petData.update(
				{
					[petSlot]: url,
				},
				{
					where: {
						user_id: userId,
						guild_id: guild,
					},
				}
			);
		}
	} catch (error) {
		logger.error(
			{ error: error },
			"Something went wrong with updating the user image."
		);
	}

	if (interaction.context == 0 && inServer != null) {
		if (cmd == "change-pet") {
			await interaction.reply({
				content: "Updated your image to the new url",
				flags: MessageFlags.Ephemeral,
			});
			const reset = new ButtonBuilder()
				.setCustomId("reset-pet")
				.setLabel("Reset Pet")
				.setStyle(ButtonStyle.Danger);
			row = reset
			reason = undefined;
		} else {
			await interaction.reply({
				content: `Updated ${target.username} image to the new url`,
				flags: MessageFlags.Ephemeral,
			});
			row = undefined;
		}

		const logMsg = `> **User**: ${target.username} (<@${target.id}>)
		> **Slot**: ${slot}
		> **Reason**: ${reason}`;

		await log(
			"Updated Pet Image",
			logMsg,
			logChannel,
			interaction.user,
			url,
			row,
			[255, 165, 0]
		);
		loggermsg = `Updated ${target.username} image ${slot} to the new url in ${interaction.guild.name}`;
	} else {
		await interaction.reply({
			content: "Updated your image to the new url",
			flags: MessageFlags.Ephemeral,
		});
		loggermsg = `Updated ${target.username} image ${slot} to the new url in ${guild}`;
	}
	if (everywhere) {
		loggermsg = `Updated ${target.username} image ${slot} to the new url everywhere`;
	}
	logger.debug(loggermsg);
};
