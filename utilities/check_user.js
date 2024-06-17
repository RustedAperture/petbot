const { petData, botData } = require('./../utilities/db');

exports.checkUser = async (user, guild) => {
	const guildSettings = await botData.findOne({
		where: { 
			guild_id: guild
		} 
	});
	const pet = await petData.findOne({
		where: { 
			user_id: user.id,
			guild_id: guild
		} 
	});
	if (!pet) {
		try {
			console.log('No pet data found for user. Creating pet data.')

			await petData.create({
				user_id: user.id,
				guild_id: guild,
				pet_img: guildSettings.get("default_pet_image"),
				has_pet: 0,
				has_been_pet: 0,
			});

			console.log(`User: ${user.displayName} has been added.`)
		}
		catch(error) {
			console.error('Something went wrong with adding the user.')
		}
	}
};
