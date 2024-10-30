const { log } = require("./log");
const { botData, petData } = require("./db");
const logger = require("../logger");
const { getPetSlot } = require("./helper");

exports.resetPet = async (interaction, userId, slot) => {
	let guildSettings, logChannel, target, pet_img;
	let inServer = interaction.guild;

	let petSlot = getPetSlot(slot);

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

		target = await interaction.guild.members.fetch(userId);

		pet_img = guildSettings.get("default_pet_image");

		let log_msg = `${target.displayName} pet image ${slot} has been reset`;

		await log(
			"Updated Pet Image",
			log_msg,
			logChannel,
			`<@${interaction.member.id}>`,
			guildSettings.get("default_pet_image")
		);

		logger.debug(
			`Reset ${target.displayName} image ${slot} to the base image in ${interaction.guild.name}`
		);
	} else {
		pet_img =
			"https://github.com/RustedAperture/Stickers/blob/main/Belly%20Rub%202.0/belly%20rub-base.png?raw=true";
		logger.debug(
			`reset ${interaction.user.displayName} image ${slot} to the base image in ${guild}`
		);
	}

	try {
		await petData.update(
			{
				[petSlot]: pet_img,
			},
			{
				where: {
					user_id: userId,
					guild_id: guild,
				},
			}
		);
	} catch (error) {
		logger.error(
			{ error: error },
			"Something went wrong with reseting the user image."
		);
	}
	if (interaction.context == 0 && inServer != null) {
	} else {
		await interaction.reply({
			content: `Reset your image ${slot} to the base pet image`,
			ephemeral: true,
		});
	}
};
