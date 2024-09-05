const { Sequelize } = require("sequelize");

async function up({ context: queryInterface }) {
	await queryInterface.bulkUpdate(
		"petData",
		{
			pet_img:
				"https://github.com/RustedAperture/Stickers/blob/main/Belly%20Rub%202.0/belly%20rub-base.png?raw=true", // Replace with your new URL
		},
		{
			pet_img:
				"https://raw.githubusercontent.com/RustedAperture/Stickers/main/Belly%20Rub%202.0/belly%20rub-base.png",
		}
	);
	await queryInterface.bulkUpdate(
		"botData",
		{
			default_pet_image:
				"https://github.com/RustedAperture/Stickers/blob/main/Belly%20Rub%202.0/belly%20rub-base.png?raw=true", // Replace with your new URL
		},
		{
			default_pet_image:
				"https://raw.githubusercontent.com/RustedAperture/Stickers/main/Belly%20Rub%202.0/belly%20rub-base.png",
		}
	);

}

module.exports = { up };
