const { petData, botData } = require("./db");
const logger = require('./../logger');

exports.checkUser = async (user, guild, interaction) => {
	let inServer = interaction.guild;
	if (interaction.context == 0 && inServer != null) {
		const guildSettings = await botData.findOne({
			where: {
				guild_id: guild,
			},
		});

		const pet = await petData.findOne({
			where: {
				user_id: user.id,
				guild_id: guild,
			},
		});
		if (!pet) {
			try {
				logger.debug(`No pet data found for user: ${user.displayName}. Creating pet data.`);

				await petData.create({
					user_id: user.id,
					guild_id: guild,
					pet_img: guildSettings.get("default_pet_image"),
					has_pet: 0,
					has_been_pet: 0,
				});

				logger.debug(`User: ${user.displayName} has been added.`);
			} catch (error) {
				logger.error("Something went wrong with adding the user.");
			}
		}
	} else {
		const pet = await petData.findOne({
			where: {
				user_id: user.id,
				guild_id: guild,
			},
		});
		const GuildPet = await petData.findOne({
			where: {
				user_id: user.id,
			},
		});
		if (!pet) {
			try {
				logger.debug(`No pet data found for user: ${user.displayName}. Creating pet data.`);

				if (!GuildPet) {
					logger.debug("Using the default pet image.");
					await petData.create({
						user_id: user.id,
						guild_id: guild,
						pet_img:
							"https://github.com/RustedAperture/Stickers/blob/main/Belly%20Rub%202.0/belly%20rub-base.png?raw=true",
						has_pet: 0,
						has_been_pet: 0,
					});
				} else {
					logger.debug("Found an existing image. Updating to use found image.");
					await petData.create({
						user_id: user.id,
						guild_id: guild,
						pet_img: GuildPet.pet_img,
						has_pet: 0,
						has_been_pet: 0,
					});
				}

				logger.debug(`User: ${user.displayName} has been added.`);
			} catch (error) {
				logger.error("Something went wrong with adding the user.");
			}
		}
	}
};
