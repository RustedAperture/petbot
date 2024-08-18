const { Sequelize } = require("sequelize");

async function up({ context: queryInterface }) {
	await queryInterface.addColumn("botData", "sleep_image", {
		type: Sequelize.TEXT,
	});
}

module.exports = { up };
