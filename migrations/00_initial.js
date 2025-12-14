const { Sequelize } = require("sequelize");

async function up({ context: queryInterface }) {
  await queryInterface.createTable("botData", {
    id: {
      type: Sequelize.INTEGER,
    },
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
    createdAt: {
      type: Sequelize.DATE,
    },
    updatedAt: {
      type: Sequelize.DATE,
    },
  });

  await queryInterface.createTable("petData", {
    id: {
      type: Sequelize.INTEGER,
    },
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
    createdAt: {
      type: Sequelize.DATE,
    },
    updatedAt: {
      type: Sequelize.DATE,
    },
  });
}

module.exports = { up };
