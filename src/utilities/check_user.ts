import { drizzleDb } from "../db/connector.js";
import { actionData, optOut } from "../db/schema.js";
import { sql, eq, and } from "drizzle-orm";
import logger from "../logger.js";
import { ActionType } from "../types/constants.js";

export const checkUser = async (
  actionType: ActionType,
  user: any,
  guild: string,
) => {
  let recordWithHighestPerformed: any;

  const rv: any = await drizzleDb
    .select({ m: sql`MAX(${actionData.hasPerformed})` })
    .from(actionData)
    .where(
      and(
        eq(actionData.userId, user.id),
        eq(actionData.actionType, actionType),
      ),
    );
  const highestValue: number | null = rv?.[0]?.m ?? null;

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

  if (!existingRecord) {
    try {
      logger.debug(
        `No ${actionType} data found for user: ${user.displayName} in ${guild}. Creating ${actionType} data.`,
      );

      if (!recordWithHighestPerformed) {
        // Leave images empty; performAction resolves the current guild
        // default (or the action's built-in default) live on every call,
        // so it stays in sync with later changes to the guild default.
        logger.debug(
          `No prior ${actionType} image found; the live default will be used.`,
        );
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

export const isOptedOut = async (userId: string): Promise<boolean> => {
  const rows = await drizzleDb
    .select({ userId: optOut.userId })
    .from(optOut)
    .where(eq(optOut.userId, userId))
    .limit(1);
  return rows.length > 0;
};

export default { checkUser, isOptedOut };
