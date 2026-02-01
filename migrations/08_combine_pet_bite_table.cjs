const { Sequelize } = require("sequelize");

async function up({ context: queryInterface }) {
  // Create the new unified ActionData table
  await queryInterface.createTable("actionData", {
    id: {
      type: Sequelize.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    user_id: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    location_id: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    action_type: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    has_performed: {
      type: Sequelize.INTEGER,
      defaultValue: 0,
    },
    has_received: {
      type: Sequelize.INTEGER,
      defaultValue: 0,
    },
    images: {
      type: Sequelize.JSON,
    },
    createdAt: {
      type: Sequelize.DATE,
    },
    updatedAt: {
      type: Sequelize.DATE,
    },
  });

  // Migrate pet data: has_pet -> has_performed, has_been_pet -> has_received
  await queryInterface.sequelize.query(`
    INSERT INTO actionData (user_id, location_id, action_type, has_performed, has_received, images, createdAt, updatedAt)
    SELECT user_id, guild_id, 'pet', has_pet, has_been_pet, images, createdAt, updatedAt
    FROM petData
  `);

  // Migrate bite data: has_bitten -> has_performed, has_been_bitten -> has_received
  await queryInterface.sequelize.query(`
    INSERT INTO actionData (user_id, location_id, action_type, has_performed, has_received, images, createdAt, updatedAt)
    SELECT user_id, guild_id, 'bite', has_bitten, has_been_bitten, images, createdAt, updatedAt
    FROM biteData
  `);

  // Drop the old tables
  await queryInterface.dropTable("petData");
  await queryInterface.dropTable("biteData");
}

async function down({ context: queryInterface }) {
  // Recreate petData table
  await queryInterface.createTable("petData", {
    id: {
      type: Sequelize.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    user_id: {
      type: Sequelize.STRING,
    },
    guild_id: {
      type: Sequelize.STRING,
    },
    images: {
      type: Sequelize.JSON,
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

  // Recreate biteData table
  await queryInterface.createTable("biteData", {
    id: {
      type: Sequelize.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    user_id: {
      type: Sequelize.STRING,
    },
    guild_id: {
      type: Sequelize.STRING,
    },
    images: {
      type: Sequelize.JSON,
    },
    has_bitten: {
      type: Sequelize.INTEGER,
    },
    has_been_bitten: {
      type: Sequelize.INTEGER,
    },
    createdAt: {
      type: Sequelize.DATE,
    },
    updatedAt: {
      type: Sequelize.DATE,
    },
  });

  // Restore pet data
  await queryInterface.sequelize.query(`
    INSERT INTO petData (user_id, guild_id, has_pet, has_been_pet, images, createdAt, updatedAt)
    SELECT user_id, location_id, has_performed, has_received, images, createdAt, updatedAt
    FROM actionData
    WHERE action_type = 'pet'
  `);

  // Restore bite data
  await queryInterface.sequelize.query(`
    INSERT INTO biteData (user_id, guild_id, has_bitten, has_been_bitten, images, createdAt, updatedAt)
    SELECT user_id, location_id, has_performed, has_received, images, createdAt, updatedAt
    FROM actionData
    WHERE action_type = 'bite'
  `);

  // Drop the unified table
  await queryInterface.dropTable("actionData");
}

module.exports = { up, down };
