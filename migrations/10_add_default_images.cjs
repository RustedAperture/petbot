const { Sequelize } = require("sequelize");

async function up({ context: queryInterface }) {
  await queryInterface.addColumn("botData", "default_images", {
    type: Sequelize.JSON,
    defaultValue: null,
  });
}

async function down({ context: queryInterface }) {
  await queryInterface.removeColumn("botData", "default_images");
}

module.exports = { up, down };