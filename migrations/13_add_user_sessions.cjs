"use strict";

async function up({ context: queryInterface }) {
  await queryInterface.createTable("userSessions", {
    user_id: {
      type: queryInterface.sequelize.Sequelize.STRING,
      allowNull: false,
      primaryKey: true,
    },
    guilds: {
      type: queryInterface.sequelize.Sequelize.JSON,
      allowNull: true,
    },
    createdAt: {
      allowNull: false,
      type: queryInterface.sequelize.Sequelize.DATE,
    },
    updatedAt: {
      allowNull: false,
      type: queryInterface.sequelize.Sequelize.DATE,
    },
  });
}

async function down({ context: queryInterface }) {
  await queryInterface.dropTable("userSessions");
}

module.exports = { up, down };

