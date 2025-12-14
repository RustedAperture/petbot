import { PetData, BotData, BiteData } from "./db.js";
import logger from "../logger.js";
import { Op } from "sequelize";

export const checkUserPet = async (user: any, guild: string) => {
  let petWithHighestHasPet: any;

  const highestHasPetValue = await PetData.max("has_pet", {
    where: {
      user_id: user.id,
    },
  });

  if (highestHasPetValue !== null) {
    petWithHighestHasPet = await PetData.findOne({
      where: {
        user_id: user.id,
        has_pet: highestHasPetValue as number,
      },
    });
  }

  const petDataForNewEntry: any = {
    user_id: user.id,
    guild_id: guild,
    has_pet: 0,
    has_been_pet: 0,
    images: [],
  };

  const pet = await PetData.findOne({
    where: {
      user_id: user.id,
      guild_id: guild,
    },
  });

  const guildSettings = await (BotData.findOne as any)({
    where: {
      guild_id: guild,
      default_pet_image: {
        [Op.ne]: null,
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
          petDataForNewEntry.images[0] = guildSettings.get(
            "default_pet_image",
          ) as string;
        }
        logger.debug("Using the default pet image.");
      } else {
        logger.debug("Found an existing image. Updating to use found image.");
        petDataForNewEntry.images = (petWithHighestHasPet as any).images;
      }

      await PetData.create(petDataForNewEntry);

      logger.debug(`User: ${user.displayName} has been added.`);
    } catch (error: any) {
      logger.error(
        { error: error },
        "Something went wrong with adding the user.",
      );
    }
  }
};

export const checkUserBite = async (user: any, guild: string) => {
  let biteWithHighestHasBitten: any;

  const highestHasBittenValue = await BiteData.max("has_bitten", {
    where: {
      user_id: user.id,
    },
  });

  if (highestHasBittenValue !== null) {
    biteWithHighestHasBitten = await BiteData.findOne({
      where: {
        user_id: user.id,
        has_bitten: highestHasBittenValue as number,
      },
    });
  }

  const biteDataForNewEntry: any = {
    user_id: user.id,
    guild_id: guild,
    has_bitten: 0,
    has_been_bitten: 0,
    images: [],
  };

  const bite = await BiteData.findOne({
    where: {
      user_id: user.id,
      guild_id: guild,
    },
  });

  const guildSettings = await (BotData.findOne as any)({
    where: {
      guild_id: guild,
      default_bite_image: {
        [Op.ne]: null,
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
          biteDataForNewEntry.images[0] = guildSettings.get(
            "default_bite_image",
          ) as string;
        }
        logger.debug("Using the default bite image.");
      } else {
        logger.debug("Found an existing image. Updating to use found image.");
        biteDataForNewEntry.images = (biteWithHighestHasBitten as any).images;
      }

      await BiteData.create(biteDataForNewEntry);

      logger.debug(`User: ${user.displayName} has been added.`);
    } catch (error: any) {
      logger.error(
        { error: error },
        "Something went wrong with adding the user.",
      );
    }
  }
};

export default { checkUserPet, checkUserBite };
