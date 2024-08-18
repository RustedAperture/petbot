const { Sequelize } = require("sequelize");

async function up({ context: queryInterface }) {
	await queryInterface.createTable("botData", {
		guild_id: {
			type: Sequelize.STRING,
		},
		default_pet_image: {
			type: Sequelize.TEXT,
		},
		log_channel: {
			type: Sequelize.STRING,
		},
		nickname: {
			type: Sequelize.STRING,
		},
	});

	await queryInterface.createTable("petData", {
		user_id: {
			type: Sequelize.STRING,
		},
		guild_id: {
			type: Sequelize.STRING,
		},
		pet_img: {
			type: Sequelize.TEXT,
		},
		has_pet: {
			type: Sequelize.INTEGER,
		},
		has_been_pet: {
			type: Sequelize.INTEGER,
		},
	});
}

module.exports = { up };
