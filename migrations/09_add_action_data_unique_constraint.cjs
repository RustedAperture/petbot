async function up({ context: queryInterface }) {
  // Check for duplicate combinations of (user_id, location_id, action_type)
  const duplicates = await queryInterface.sequelize.query(
    `
    SELECT user_id, location_id, action_type, COUNT(*) as count
    FROM actionData
    GROUP BY user_id, location_id, action_type
    HAVING count > 1
  `,
    { type: queryInterface.sequelize.QueryTypes.SELECT },
  );

  if (duplicates.length > 0) {
    console.log(`Found ${duplicates.length} duplicate groups to merge...`);

    // For each duplicate group, merge the data
    for (const dup of duplicates) {
      const { user_id, location_id, action_type } = dup;

      // Get all rows for this duplicate group
      const rows = await queryInterface.sequelize.query(
        `
        SELECT * FROM actionData 
        WHERE user_id = :user_id 
          AND location_id IS :location_id 
          AND action_type = :action_type
        ORDER BY id ASC
      `,
        {
          type: queryInterface.sequelize.QueryTypes.SELECT,
          replacements: {
            user_id,
            location_id: location_id === null ? null : location_id,
            action_type,
          },
        },
      );

      if (rows.length > 1) {
        // Calculate merged values
        let totalPerformed = 0;
        let totalReceived = 0;
        const allImages = new Set();
        let earliestCreatedAt = rows[0].createdAt;
        let latestUpdatedAt = rows[0].updatedAt;

        for (const row of rows) {
          totalPerformed += row.has_performed || 0;
          totalReceived += row.has_received || 0;

          // Merge images (handle both JSON string and array)
          let images = row.images;
          if (typeof images === "string") {
            try {
              images = JSON.parse(images);
            } catch {
              images = [];
            }
          }
          if (Array.isArray(images)) {
            images.forEach((img) => allImages.add(img));
          }

          // Track earliest createdAt and latest updatedAt
          if (new Date(row.createdAt) < new Date(earliestCreatedAt)) {
            earliestCreatedAt = row.createdAt;
          }
          if (new Date(row.updatedAt) > new Date(latestUpdatedAt)) {
            latestUpdatedAt = row.updatedAt;
          }
        }

        const mergedImages = JSON.stringify(Array.from(allImages));

        // Keep the first row (lowest id) and update with merged values
        const keepId = rows[0].id;
        await queryInterface.sequelize.query(
          `
          UPDATE actionData 
          SET has_performed = :has_performed,
              has_received = :has_received,
              images = :images,
              createdAt = :createdAt,
              updatedAt = :updatedAt
          WHERE id = :id
        `,
          {
            replacements: {
              id: keepId,
              has_performed: totalPerformed,
              has_received: totalReceived,
              images: mergedImages,
              createdAt: earliestCreatedAt,
              updatedAt: latestUpdatedAt,
            },
          },
        );

        // Delete duplicate rows (keeping the first one)
        const idsToDelete = rows.slice(1).map((r) => r.id);
        await queryInterface.sequelize.query(
          `
          DELETE FROM actionData WHERE id IN (:ids)
        `,
          {
            replacements: { ids: idsToDelete },
          },
        );
      }
    }

    console.log("Duplicate merging complete.");
  }

  // Create the unique composite index
  await queryInterface.addIndex(
    "actionData",
    ["user_id", "location_id", "action_type"],
    {
      unique: true,
      name: "action_data_unique_constraint",
    },
  );
}

async function down({ context: queryInterface }) {
  // Remove the unique index
  await queryInterface.removeIndex(
    "actionData",
    "action_data_unique_constraint",
  );
}

module.exports = { up, down };
