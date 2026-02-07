async function up({ context: queryInterface }) {
  // Drop legacy per-action default image columns which are now stored in `default_images`
  await queryInterface.removeColumn("botData", "default_pet_image");
  await queryInterface.removeColumn("botData", "default_bite_image");
}

async function down({ context: queryInterface }) {
  // Recreate legacy columns if we need to roll back
  await queryInterface.addColumn("botData", "default_pet_image", {
    type: queryInterface.sequelize.Sequelize.TEXT,
    defaultValue: null,
  });
  await queryInterface.addColumn("botData", "default_bite_image", {
    type: queryInterface.sequelize.Sequelize.TEXT,
    defaultValue: null,
  });
}

module.exports = { up, down };