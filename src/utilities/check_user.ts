import { drizzleDb } from "../db/connector.js";
import { actionData, botData } from "../db/schema.js";
import { sql, eq, and } from "drizzle-orm";
import logger from "../logger.js";
import { ACTIONS, ActionType } from "../types/constants.js";

export const checkUser = async (
  actionType: ActionType,
  user: any,
  guild: string,
) => {
  const config = ACTIONS[actionType];
  let recordWithHighestPerformed: any;

  let highestValue: number | null = null;
  const rv: any = await drizzleDb
    .select({ m: sql`MAX(${actionData.hasPerformed})` })
    .from(actionData)
    .where(
      and(
        eq(actionData.userId, user.id),
        eq(actionData.actionType, actionType),
      ),
    );
  highestValue = rv?.[0]?.m ?? null;

  if (highestValue !== null) {
    const rows: any[] = await drizzleDb
      .select()
      .from(actionData)
      .where(
        and(
          eq(actionData.userId, user.id),
          eq(actionData.hasPerformed, highestValue),
          eq(actionData.actionType, actionType),
        ),
      )
      .limit(1);
    recordWithHighestPerformed = rows?.[0] ?? null;
  }

  const dataForNewEntry: any = {
    userId: user.id,
    locationId: guild,
    hasPerformed: 0,
    hasReceived: 0,
    actionType: actionType,
    images: [],
  };

  const existingRows: any[] = await drizzleDb
    .select()
    .from(actionData)
    .where(
      and(
        eq(actionData.userId, user.id),
        eq(actionData.locationId, guild),
        eq(actionData.actionType, actionType),
      ),
    )
    .limit(1);
  const existingRecord: any = existingRows?.[0] ?? null;

  const gsRows: any[] = await drizzleDb
    .select()
    .from(botData)
    .where(eq(botData.guildId, guild))
    .limit(1);
  const guildSettings: any = gsRows?.[0] ?? null;

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
          const defaultImages =
            typeof guildSettings?.get === "function"
              ? (guildSettings.default_images as
                  | Record<string, string>
                  | null
                  | undefined)
              : (guildSettings.defaultImages ?? guildSettings.default_images);
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

      await drizzleDb.insert(actionData).values({
        userId: dataForNewEntry.userId,
        locationId: dataForNewEntry.locationId,
        hasPerformed: dataForNewEntry.hasPerformed,
        hasReceived: dataForNewEntry.hasReceived,
        actionType: dataForNewEntry.actionType,
        images: dataForNewEntry.images,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

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
