const { Events } = require("discord.js");
const { petData, botData } = require('./../utilities/db');
const logger = require('./../logger');

module.exports = {
	name: Events.ClientReady,
	once: true,
	execute(client) {
		petData.sync();
		botData.sync();
		logger.info(`Ready! Logged in as ${client.user.tag}`);
	},
};
