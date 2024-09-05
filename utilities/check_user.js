const { petData, botData } = require("./db");

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
				console.log("No pet data found for user. Creating pet data.");

				await petData.create({
					user_id: user.id,
					guild_id: guild,
					pet_img: guildSettings.get("default_pet_image"),
					has_pet: 0,
					has_been_pet: 0,
				});

				console.log(`User: ${user.displayName} has been added.`);
			} catch (error) {
				console.error("Something went wrong with adding the user.");
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
				console.log("No pet data found for user. Creating pet data.");

				if (!GuildPet) {
					console.log("setting default pet image");
					await petData.create({
						user_id: user.id,
						guild_id: guild,
						pet_img:
							"https://raw.githubusercontent.com/RustedAperture/Stickers/main/Belly%20Rub%202.0/belly%20rub-base.png",
						has_pet: 0,
						has_been_pet: 0,
					});
				} else {
					console.log("setting pet image to one in guild");
					await petData.create({
						user_id: user.id,
						guild_id: guild,
						pet_img: GuildPet.pet_img,
						has_pet: 0,
						has_been_pet: 0,
					});
				}

				console.log(`User: ${user.displayName} has been added.`);
			} catch (error) {
				console.error("Something went wrong with adding the user.");
			}
		}
	}
};
