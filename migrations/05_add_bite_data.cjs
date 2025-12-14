const { Sequelize } = require("sequelize");

async function up({ context: queryInterface }) {
  // Create the biteData table with images as JSON
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

  // Migrate petData to JSON for images
  // Add the new images column
  await queryInterface.addColumn("petData", "images", {
    type: Sequelize.JSON,
  });

  // Migrate data: Build arrays from old fields, filtering nulls/empties
  // Use a CASE to handle variable number of non-null fields
  await queryInterface.sequelize.query(`
        UPDATE petData 
        SET images = json(
            CASE 
                WHEN pet_img_four IS NOT NULL AND pet_img_four != '' THEN 
                    '[' || json_quote(pet_img) || ',' || json_quote(pet_img_two) || ',' || json_quote(pet_img_three) || ',' || json_quote(pet_img_four) || ']'
                WHEN pet_img_three IS NOT NULL AND pet_img_three != '' THEN 
                    '[' || json_quote(pet_img) || ',' || json_quote(pet_img_two) || ',' || json_quote(pet_img_three) || ']'
                WHEN pet_img_two IS NOT NULL AND pet_img_two != '' THEN 
                    '[' || json_quote(pet_img) || ',' || json_quote(pet_img_two) || ']'
                ELSE '[' || json_quote(pet_img) || ']' 
            END
        )
        WHERE images IS NULL;
    `);

  // Drop old columns
  await queryInterface.removeColumn("petData", "pet_img");
  await queryInterface.removeColumn("petData", "pet_img_two");
  await queryInterface.removeColumn("petData", "pet_img_three");
  await queryInterface.removeColumn("petData", "pet_img_four");
}

module.exports = { up };
