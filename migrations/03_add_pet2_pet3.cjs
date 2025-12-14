const { Sequelize } = require("sequelize");

async function up({ context: queryInterface }) {
  await queryInterface.addColumn("petData", "pet_img_two", {
    type: Sequelize.TEXT,
    after: "pet_img",
  });
  await queryInterface.addColumn("petData", "pet_img_three", {
    type: Sequelize.TEXT,
    after: "pet_img_two",
  });
}

module.exports = { up };
