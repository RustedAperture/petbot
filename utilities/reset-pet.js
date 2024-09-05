const { log } = require("./log");
const { botData, petData } = require("./db");

exports.resetPet = async (interaction, userId) => {
	let guild, guildSettings, logChannel, target;
	let inServer = interaction.guild;

	if (interaction.context == 0 && inServer != null) {
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

		await petData.update(
			{
				pet_img: guildSettings.get("default_pet_image"),
			},
			{
				where: {
					user_id: userId,
					guild_id: guild,
				},
			}
		);

		let log_msg = `${target.displayName} pet image has been reset`;

		await log(
			"Updated Pet Image",
			log_msg,
			logChannel,
			`<@${interaction.member.id}>`,
			guildSettings.get("default_pet_image")
		);
	} else {
		if (inServer == null) {
			guild = interaction.guildId;
		} else {
			guild = interaction.channelId;
		}

		await petData.update(
			{
				pet_img:
					"https://raw.githubusercontent.com/RustedAperture/Stickers/main/Belly%20Rub%202.0/belly%20rub-base.png",
			},
			{
				where: {
					user_id: userId,
					guild_id: guild,
				},
			}
		);
	}

	await interaction.reply({
		content: "Reset your image to the base pet image",
		ephemeral: true,
	});
};
