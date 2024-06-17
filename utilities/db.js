const Sequelize = require('sequelize');

const sequelize = new Sequelize('database', 'user', 'password', {
	host: 'localhost',
	dialect: 'sqlite',
	logging: false,
	// SQLite only
	storage: 'data/database.sqlite',
});

const petData = sequelize.define('petData', {
	user_id: Sequelize.STRING,
    guild_id: Sequelize.STRING,
	pet_img: Sequelize.TEXT,
	has_pet: Sequelize.INTEGER,
	has_been_pet: Sequelize.INTEGER,
});

const botData = sequelize.define('botData', {
    guild_id: Sequelize.STRING,
	default_pet_image: Sequelize.TEXT,
    log_channel: Sequelize.STRING,
    nickname: Sequelize.STRING
});

module.exports = { petData, botData, sequelize };