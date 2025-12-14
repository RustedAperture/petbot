const { Sequelize } = require("sequelize");

async function up({ context: queryInterface }) {
  // Check if petData needs fixing
  const petDataTableInfo = await queryInterface.sequelize.query(
    "PRAGMA table_info(petData)",
    { type: queryInterface.sequelize.QueryTypes.SELECT },
  );

  const petDataIdColumn = petDataTableInfo.find((col) => col.name === "id");
  const petDataNeedsFix = !petDataIdColumn || petDataIdColumn.pk !== 1;

  if (petDataNeedsFix) {
    // Backup petData
    await queryInterface.renameTable("petData", "petData_backup");

    // Create new petData with proper primary key
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

    // Copy data back (id will be auto-generated)
    await queryInterface.sequelize.query(`
      INSERT INTO petData (user_id, guild_id, images, has_pet, has_been_pet, createdAt, updatedAt)
      SELECT user_id, guild_id, images, has_pet, has_been_pet, createdAt, updatedAt
      FROM petData_backup
    `);

    // Drop backup
    await queryInterface.dropTable("petData_backup");
  }

  // Check if botData needs fixing
  const botDataTableInfo = await queryInterface.sequelize.query(
    "PRAGMA table_info(botData)",
    { type: queryInterface.sequelize.QueryTypes.SELECT },
  );

  const botDataIdColumn = botDataTableInfo.find((col) => col.name === "id");
  const botDataNeedsFix = !botDataIdColumn || botDataIdColumn.pk !== 1;

  if (botDataNeedsFix) {
    // Same for botData
    await queryInterface.renameTable("botData", "botData_backup");

    await queryInterface.createTable("botData", {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
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
      sleep_image: {
        type: Sequelize.TEXT,
      },
      createdAt: {
        type: Sequelize.DATE,
      },
      updatedAt: {
        type: Sequelize.DATE,
      },
    });

    await queryInterface.sequelize.query(`
      INSERT INTO botData (guild_id, default_pet_image, log_channel, nickname, sleep_image, createdAt, updatedAt)
      SELECT guild_id, default_pet_image, log_channel, nickname, sleep_image, createdAt, updatedAt
      FROM botData_backup
    `);

    await queryInterface.dropTable("botData_backup");
  }
}

async function down({ context: _queryInterface }) {
  // Not reversible - would lose auto-generated IDs
  throw new Error("Cannot reverse this migration");
}

module.exports = { up, down };
