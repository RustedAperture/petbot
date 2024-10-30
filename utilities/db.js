const Sequelize = require("sequelize");

const sequelize = new Sequelize("database", "user", "password", {
	host: "localhost",
	dialect: "sqlite",
	logging: false,
	// SQLite only
	storage: "data/database.sqlite",
});

const petData = sequelize.define("petData", {
	id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
	user_id: Sequelize.STRING,
	guild_id: Sequelize.STRING,
	pet_img: Sequelize.TEXT,
	pet_img_two: Sequelize.TEXT,
	pet_img_three: Sequelize.TEXT,
	has_pet: Sequelize.INTEGER,
	has_been_pet: Sequelize.INTEGER,
	createdAt: Sequelize.DATE,
	updatedAt: Sequelize.DATE,
});

const botData = sequelize.define("botData", {
	id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
	guild_id: Sequelize.STRING,
	default_pet_image: Sequelize.TEXT,
	log_channel: Sequelize.STRING,
	nickname: Sequelize.STRING,
	sleep_image: Sequelize.TEXT,
	createdAt: Sequelize.DATE,
	updatedAt: Sequelize.DATE,
});

module.exports = { petData, botData, sequelize };
