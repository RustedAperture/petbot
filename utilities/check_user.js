const { petData, botData, biteData } = require("./db");
const logger = require("./../logger");

exports.checkUserPet = async (user, guild) => {
  let petWithHighestHasPet;

  const highestHasPetValue = await petData.max("has_pet", {
    where: {
      user_id: user.id,
    },
  });

  if (highestHasPetValue !== null) {
    petWithHighestHasPet = await petData.findOne({
      where: {
        user_id: user.id,
        has_pet: highestHasPetValue,
      },
    });
  }

  const petDataForNewEntry = {
    user_id: user.id,
    guild_id: guild,
    has_pet: 0,
    has_been_pet: 0,
    images: [],
  };

  const pet = await petData.findOne({
    where: {
      user_id: user.id,
      guild_id: guild,
    },
  });

  const guildSettings = await botData.findOne({
    where: {
      guild_id: guild,
      default_pet_image: {
        [require("sequelize").Op.ne]: null,
      },
    },
  });

  if (!pet) {
    try {
      logger.debug(
        `No pet data found for user: ${user.displayName}. Creating pet data.`,
      );

      if (!petWithHighestHasPet) {
        if (!guildSettings) {
          logger.debug(
            "No guild settings found or in a DM, using defult pet image",
          );
          petDataForNewEntry.images[0] =
            "https://github.com/RustedAperture/Stickers/blob/main/Belly%20Rub%202.0/belly%20rub-base.png?raw=true";
        } else {
          logger.debug("Guild settings found, using guild default image");
          petDataForNewEntry.images[0] = guildSettings.get("default_pet_image");
        }
        logger.debug("Using the default pet image.");
      } else {
        logger.debug("Found an existing image. Updating to use found image.");
        petDataForNewEntry.images = petWithHighestHasPet.images;
      }

      await petData.create(petDataForNewEntry);

      logger.debug(`User: ${user.displayName} has been added.`);
    } catch (error) {
      logger.error(
        { error: error },
        "Something went wrong with adding the user.",
      );
    }
  }
};

exports.checkUserBite = async (user, guild) => {
  let biteWithHighestHasBitten;

  const highestHasBittenValue = await biteData.max("has_bitten", {
    where: {
      user_id: user.id,
    },
  });

  if (highestHasBittenValue !== null) {
    biteWithHighestHasBitten = await biteData.findOne({
      where: {
        user_id: user.id,
        has_bitten: highestHasBittenValue,
      },
    });
  }

  const biteDataForNewEntry = {
    user_id: user.id,
    guild_id: guild,
    has_bitten: 0,
    has_been_bitten: 0,
    images: [],
  };

  const bite = await biteData.findOne({
    where: {
      user_id: user.id,
      guild_id: guild,
    },
  });

  const guildSettings = await botData.findOne({
    where: {
      guild_id: guild,
      default_bite_image: {
        [require("sequelize").Op.ne]: null,
      },
    },
  });

  if (!bite) {
    try {
      logger.debug(
        `No bite data found for user: ${user.displayName}. Creating bite data.`,
      );

      if (!biteWithHighestHasBitten) {
        if (!guildSettings) {
          logger.debug(
            "No guild settings found or in a DM, using default bite image",
          );
          biteDataForNewEntry.images[0] =
            "https://cloud.wfox.app/s/E9sXZLSAGw28M3K/preview";
        } else {
          logger.debug("Guild settings found, using guild default image");
          biteDataForNewEntry.images[0] =
            guildSettings.get("default_bite_image");
        }
        logger.debug("Using the default bite image.");
      } else {
        logger.debug("Found an existing image. Updating to use found image.");
        biteDataForNewEntry.images = biteWithHighestHasBitten.images;
      }

      await biteData.create(biteDataForNewEntry);

      logger.debug(`User: ${user.displayName} has been added.`);
    } catch (error) {
      logger.error(
        { error: error },
        "Something went wrong with adding the user.",
      );
    }
  }
};
