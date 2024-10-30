const { petData, botData } = require("./db");
const logger = require("./../logger");

exports.checkUser = async (user, guild, interaction) => {
	let inServer = interaction.guild;
	let petWithHighestHasPet;

	const highestHasPetValue = await petData.max("has_pet", {
		where: {
			user_id: user.id,
		},
	});

	if (highestHasPetValue !== null) {
		petWithHighestHasPet = await petData.findOne({
			where: {
				user_id: user.id,
				has_pet: highestHasPetValue,
			},
		});
	}

	const petDataForNewEntry = {
		user_id: user.id,
		guild_id: guild,
		has_pet: 0,
		has_been_pet: 0,
	};

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
				logger.debug(
					`No pet data found for user: ${user.displayName}. Creating pet data.`
				);

				if (!petWithHighestHasPet) {
					logger.debug("Using the default pet image.");
					petDataForNewEntry.pet_img =
						guildSettings.get("default_pet_image");
				} else {
					logger.debug(
						"Found an existing image. Updating to use found image."
					);
					petDataForNewEntry.pet_img = petWithHighestHasPet.pet_img;
					petDataForNewEntry.pet_img_two =
						petWithHighestHasPet.pet_img_two;
					petDataForNewEntry.pet_img_three =
						petWithHighestHasPet.pet_img_three;
					petDataForNewEntry.pet_img_four =
						petWithHighestHasPet.pet_img_four;
				}

				await petData.create(petDataForNewEntry);

				logger.debug(`User: ${user.displayName} has been added.`);
			} catch (error) {
				logger.error(
					{ error: error },
					"Something went wrong with adding the user."
				);
			}
		}
	} else {
		const pet = await petData.findOne({
			where: {
				user_id: user.id,
				guild_id: guild,
			},
		});

		if (!pet) {
			try {
				logger.debug(
					`No pet data found for user: ${user.displayName}. Creating pet data.`
				);

				if (!petWithHighestHasPet) {
					logger.debug("Using the default pet image.");
					petDataForNewEntry.pet_img =
						"https://github.com/RustedAperture/Stickers/blob/main/Belly%20Rub%202.0/belly%20rub-base.png?raw=true";
				} else {
					logger.debug(
						"Found an existing image. Updating to use found image."
					);
					petDataForNewEntry.pet_img = petWithHighestHasPet.pet_img;
					petDataForNewEntry.pet_img_two =
						petWithHighestHasPet.pet_img_two;
					petDataForNewEntry.pet_img_three =
						petWithHighestHasPet.pet_img_three;
					petDataForNewEntry.pet_img_four =
						petWithHighestHasPet.pet_img_four;
				}

				await petData.create(petDataForNewEntry);

				logger.debug(`User: ${user.displayName} has been added.`);
			} catch (error) {
				logger.error(
					{ error: error },
					"Something went wrong with adding the user."
				);
			}
		}
	}
};
