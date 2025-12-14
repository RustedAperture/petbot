const { Sequelize } = require("sequelize");

async function up({ context: queryInterface }) {
  await queryInterface.addColumn("petData", "pet_img_four", {
    type: Sequelize.TEXT,
    after: "pet_img_three",
  });
}

module.exports = { up };
