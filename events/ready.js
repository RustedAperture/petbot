const { Events } = require("discord.js");
const { petData, botData } = require('./../utilities/db');

module.exports = {
	name: Events.ClientReady,
	once: true,
	execute(client) {
		petData.sync();
		botData.sync();
		console.log(`Ready! Logged in as ${client.user.tag}`);
	},
};
