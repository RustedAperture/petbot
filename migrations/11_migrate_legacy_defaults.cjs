async function up({ context: queryInterface }) {
  const rows = await queryInterface.sequelize.query(
    "SELECT id, default_images, default_pet_image, default_bite_image FROM botData",
    { type: queryInterface.sequelize.QueryTypes.SELECT },
  );

  for (const row of rows) {
    let map = {};
    try {
      if (row.default_images) {
        map = typeof row.default_images === "string" ? JSON.parse(row.default_images) : row.default_images;
      }
    } catch {
      // if parsing fails, just start fresh
      map = {};
    }

    let changed = false;

    if (row.default_pet_image && !map.pet) {
      map.pet = row.default_pet_image;
      changed = true;
    }
    if (row.default_bite_image && !map.bite) {
      map.bite = row.default_bite_image;
      changed = true;
    }

    if (changed) {
      // Ensure we store a proper JSON string to avoid [object Object] coercion
      await queryInterface.bulkUpdate(
        "botData",
        {
          default_images: JSON.stringify(map),
          // null the old columns so future logic relies on the JSON map
          default_pet_image: null,
          default_bite_image: null,
        },
        { id: row.id },
      );
    }
  }
}

async function down({ context: queryInterface }) {
  const rows = await queryInterface.sequelize.query(
    "SELECT id, default_images, default_pet_image, default_bite_image FROM botData",
    { type: queryInterface.sequelize.QueryTypes.SELECT },
  );

  for (const row of rows) {
    let map = {};
    try {
      if (row.default_images) {
        map = typeof row.default_images === "string" ? JSON.parse(row.default_images) : row.default_images;
      }
    } catch {
      map = {};
    }

    const updates = {};
    let changed = false;

    if (!row.default_pet_image && map.pet) {
      updates.default_pet_image = map.pet;
      changed = true;
    }
    if (!row.default_bite_image && map.bite) {
      updates.default_bite_image = map.bite;
      changed = true;
    }

    if (changed) {
      // Only write back the legacy columns that we recovered
      await queryInterface.bulkUpdate(
        "botData",
        updates,
        { id: row.id },
      );
    }
  }
}

module.exports = { up, down };