const { log } = require("./log");
const { botData, petData } = require("./db");
const logger = require("../logger");

exports.resetPet = async (interaction, userId) => {
	let guildSettings, logChannel, target, pet_img;
	let inServer = interaction.guild;

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

		pet_img = guildSettings.get("default_pet_image");

		let log_msg = `${target.displayName} pet image has been reset`;

		await log(
			"Updated Pet Image",
			log_msg,
			logChannel,
			`<@${interaction.member.id}>`,
			guildSettings.get("default_pet_image")
		);

		logger.debug(
			`Reset ${target.displayName} image to the base image in ${interaction.guild.name}`
		);
	} else {
		pet_img =
			"https://github.com/RustedAperture/Stickers/blob/main/Belly%20Rub%202.0/belly%20rub-base.png?raw=true";
		logger.debug(
			`reset ${interaction.user.displayName} image to the base image in ${guild}`
		);
	}

	try {
		await petData.update(
			{
				pet_img: pet_img,
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

	await interaction.reply({
		content: "Reset your image to the base pet image",
		ephemeral: true,
	});
};
