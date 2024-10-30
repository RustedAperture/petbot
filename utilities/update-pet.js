const { ButtonStyle, ButtonBuilder, ActionRowBuilder } = require("discord.js");
const { botData, petData } = require("./db");
const { log } = require("./log");
const logger = require("../logger");

exports.updatePet = async (
	interaction,
	userId,
	url,
	everywhere = false,
	reason = null,
	slot
) => {
	let guildSettings, logChannel, target;
	let inServer = interaction.guild;
	let loggermsg;
	let petSlot;

	switch (slot) {
		case 1:
			petSlot = "pet_img";
			break;
		case 2:
			petSlot = "pet_img_two";
			break;
		case 3:
			petSlot = "pet_img_three";
			break;
	}

	let guild = interaction.guildId;
	if (guild == null) {
		guild = interaction.channelId;
	}

	if (interaction.context == 0 && inServer != null) {
		guildSettings = await botData.findOne({
			where: {
				guild_id: guild,
			},
		});
		logChannel = await interaction.guild.channels.fetch(
			guildSettings.get("log_channel")
		);
		target = await interaction.guild.members.fetch(userId);
	} else {
		target = interaction.user;
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
		const logMsg = `${target.displayName} pet image ${slot} has been updated`;

		if (cmd == "change-pet") {
			await interaction.reply({
				content: "Updated your image to the new url",
				ephemeral: true,
			});
			const reset = new ButtonBuilder()
				.setCustomId("reset-pet")
				.setLabel("Reset Pet")
				.setStyle(ButtonStyle.Danger);
			row = new ActionRowBuilder().addComponents(reset);
			reason = undefined;
		} else {
			await interaction.reply({
				content: `Updated ${target.displayName} image to the new url`,
				ephemeral: true,
			});
			row = undefined;
		}

		await log(
			"Updated Pet Image",
			logMsg,
			logChannel,
			`<@${interaction.member.id}>`,
			url,
			reason,
			row
		);
		loggermsg = `Updated ${target.displayName} image ${slot} to the new url in ${interaction.guild.name}`;
	} else {
		await interaction.reply({
			content: "Updated your image to the new url",
			ephemeral: true,
		});
		loggermsg = `Updated ${target.displayName} image ${slot} to the new url in ${guild}`;
	}
	if (everywhere) {
		loggermsg = `Updated ${target.displayName} image ${slot} to the new url everywhere`;
	}
	logger.debug(loggermsg);
};
