import { ActionData, BotData } from "./db.js";
import logger from "../logger.js";
import { Op } from "sequelize";
import { ACTIONS, ActionType } from "../types/constants.js";

export const checkUser = async (
  actionType: ActionType,
  user: any,
  guild: string,
) => {
  const config = ACTIONS[actionType];
  let recordWithHighestPerformed: any;

  const highestValue = await ActionData.max("has_performed", {
    where: {
      user_id: user.id,
      action_type: actionType,
    },
  });

  if (highestValue !== null) {
    recordWithHighestPerformed = await ActionData.findOne({
      where: {
        user_id: user.id,
        has_performed: highestValue as number,
        action_type: actionType,
      },
    });
  }

  const dataForNewEntry: any = {
    user_id: user.id,
    location_id: guild,
    has_performed: 0,
    has_received: 0,
    action_type: actionType,
    images: [],
  };

  const existingRecord = await ActionData.findOne({
    where: {
      user_id: user.id,
      location_id: guild,
      action_type: actionType,
    },
  });

  const guildSettings = await BotData.findOne({ where: { guild_id: guild } });

  if (!existingRecord) {
    try {
      logger.debug(
        `No ${actionType} data found for user: ${user.displayName} in ${guild}. Creating ${actionType} data.`,
      );

      if (!recordWithHighestPerformed) {
        if (!guildSettings) {
          logger.debug(
            `No guild settings found or in a DM, using default ${actionType} image`,
          );
          dataForNewEntry.images[0] = config.defaultImage;
        } else {
          // use the JSON map only
          const defaultImages = guildSettings.get("default_images") as
            | Record<string, string>
            | null
            | undefined;
          if (defaultImages && defaultImages[actionType]) {
            logger.debug("Guild default images map found, using mapped image");
            dataForNewEntry.images[0] = defaultImages[actionType];
          } else {
            logger.debug(
              "No guild-specific default, using action default image",
            );
            dataForNewEntry.images[0] = config.defaultImage;
          }
        }
        logger.debug(`Using the default ${actionType} image.`);
      } else {
        logger.debug("Found an existing image. Updating to use found image.");
        dataForNewEntry.images = (recordWithHighestPerformed as any).images;
      }

      await ActionData.create(dataForNewEntry);

      logger.debug(`User: ${user.displayName} has been added.`);
    } catch (error: any) {
      logger.error(
        { error: error },
        "Something went wrong with adding the user.",
      );
    }
  }
};

export default { checkUser };
