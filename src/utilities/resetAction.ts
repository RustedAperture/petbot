import { log } from "./log.js";
import { drizzleDb } from "../db/connector.js";
import { actionData, botData } from "../db/schema.js";
import { eq, and } from "drizzle-orm";
import logger from "../logger.js";
import { ACTIONS, ActionType as ActionKind } from "../types/constants.js";

const capitalize = (str: string) => str.charAt(0).toUpperCase() + str.slice(1);

export const resetAction = async (
  actionKind: ActionKind,
  interaction: any,
  userId: string,
  slot: number,
  everywhere: boolean = false,
) => {
  const config = ACTIONS[actionKind];
  let guildSettings: any, logChannel: any, img: string | null | undefined;
  const inServer = interaction.guild;
  const target = interaction.user;
  const guild = interaction.guildId ?? interaction.channelId;
  let loggermsg = "";

  if (interaction.context === 0 && inServer != null) {
    const rows: any[] = await drizzleDb
      .select()
      .from(botData)
      .where(eq(botData.guildId, guild))
      .limit(1);
    guildSettings = rows?.[0] ?? null;

    if (guildSettings) {
      const logChannelId = guildSettings.logChannel;
      logChannel = await interaction.guild.channels.fetch(logChannelId as any);
    }

    const defaultImagesRaw = guildSettings
      ? guildSettings.defaultImages
      : undefined;
    let baseImage: string;
    if (defaultImagesRaw && typeof defaultImagesRaw === "object") {
      baseImage =
        (defaultImagesRaw as Record<string, string>)[actionKind] ??
        config.defaultImage;
    } else if (typeof defaultImagesRaw === "string") {
      baseImage = defaultImagesRaw as string;
    } else {
      baseImage = config.defaultImage;
    }
    img = slot === 1 ? baseImage : null;
    const logMsg = `> **User**: ${target.username} (<@${target.id}>)
    > **Slot**: ${slot}${everywhere ? "\n    > **Everywhere**: true" : ""}`;

    await log(
      `Reset ${capitalize(config.noun)} Image`,
      logMsg,
      logChannel,
      target,
      img ?? null,
      null,
      [255, 0, 0] as any,
    );

    logger.debug(
      `Reset ${target.displayName} image ${slot} to the base image in ${interaction.guild.name}`,
    );
  } else {
    img = slot === 1 ? config.defaultImage : null;
    logger.debug(
      `reset ${interaction.user.displayName} image ${slot} to the base image in ${guild}`,
    );
  }

  try {
    logger.debug(
      `resetting ${userId} image ${slot} to the base image for ${guild}`,
    );

    if (everywhere) {
      const records: any[] = await drizzleDb
        .select()
        .from(actionData)
        .where(
          and(
            eq(actionData.userId, userId),
            eq(actionData.actionType, actionKind),
          ),
        );

      if (!records || records.length === 0) {
        logger.error(
          `No ${actionKind} records found for user ${userId} to reset everywhere`,
        );
        return;
      }

      for (const record of records) {
        const imagesArray: string[] = (record.images as string[]) ?? [];
        if (slot > 1) {
          imagesArray.splice(slot - 1, 1);
        } else {
          imagesArray[slot - 1] = img!;
        }
        const cleanedImages = imagesArray.filter(
          (image: string) => image && image.trim() !== "",
        );
        await drizzleDb
          .update(actionData)
          .set({
            images: cleanedImages,
            updatedAt: new Date().toISOString(),
          })
          .where(eq(actionData.id, record.id));
      }

      loggermsg = `Reset ${target.username} image ${slot} to the base image everywhere`;
    } else {
      const rows: any[] = await drizzleDb
        .select()
        .from(actionData)
        .where(
          and(
            eq(actionData.userId, userId),
            eq(actionData.locationId, guild),
            eq(actionData.actionType, actionKind),
          ),
        )
        .limit(1);
      const record = rows?.[0];
      if (!record) {
        logger.error(
          `No ${actionKind} record found for user ${userId} in ${guild}`,
        );
        return;
      }

      const imagesArray: string[] = (record.images as string[]) ?? [];
      if (slot > 1) {
        imagesArray.splice(slot - 1, 1);
      } else {
        imagesArray[slot - 1] = img!;
      }
      const cleanedImages = imagesArray.filter(
        (image: string) => image && image.trim() !== "",
      );
      await drizzleDb
        .update(actionData)
        .set({
          images: cleanedImages,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(actionData.id, record.id));

      loggermsg = `Reset ${target.username} image ${slot} to the base image for ${guild}`;
    }
  } catch (error: any) {
    logger.error(
      { error: error },
      "Something went wrong with resetting the user image.",
    );
  }

  logger.debug(loggermsg);
};

export default { resetAction };
