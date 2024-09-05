const { ButtonStyle, ButtonBuilder, ActionRowBuilder } = require("discord.js");
const { botData, petData } = require("./db");
const { log } = require("./log");

exports.updatePet = async (interaction, userId, url, reason = null) => {
	let guild, guildSettings, logChannel, target;

	if (interaction.context == 0) {
		guild = interaction.guildId;
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
		guild = interaction.channelId;
	}

	const cmd = interaction.commandName;

	await petData.update(
		{
			pet_img: url,
		},
		{
			where: {
				user_id: userId,
				guild_id: guild,
			},
		}
	);

	if (interaction.context == 0) {
		const logMsg = `${target.displayName} pet Image has been updated`;

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
	} else {
		await interaction.reply({
			content: "Updated your image to the new url",
			ephemeral: true,
		});
	}
};
