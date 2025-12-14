const { Sequelize } = require("sequelize");

async function up({ context: queryInterface }) {
  await queryInterface.addColumn("botData", "default_bite_image", {
    type: Sequelize.TEXT,
  });
}

module.exports = { up };
