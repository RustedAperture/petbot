import type { Request, Response } from "express";
import { drizzleDb } from "../../db/connector.js";
import { actionData } from "../../db/schema.js";
import { eq, and } from "drizzle-orm";
import { ACTIONS, type ActionType } from "../../types/constants.js";
import logger from "../../logger.js";

const MAX_URL_LENGTH = 2048;
const ALLOWED_SCHEMES = /^https?:\/\//i;

/**
 * POST /api/setImages — set action images for a user.
 * Body: { userId, actionType, images, everywhere?, guildId? }
 */
export default async function setImagesHandler(
  req: Request,
  res: Response,
): Promise<void> {
  const { userId, guildId, actionType, images, everywhere } = req.body;

  if (typeof userId !== "string" || !/^\d+$/.test(userId)) {
    res.status(400).json({ error: "invalid_userId" });
    return;
  }

  if (typeof actionType !== "string" || !(actionType in ACTIONS)) {
    res.status(400).json({ error: "invalid_actionType" });
    return;
  }

  if (
    !Array.isArray(images) ||
    images.length > 4 ||
    images.some((img: unknown) => {
      if (typeof img !== "string") {
        return true;
      }
      const trimmed = img.trim();
      return (
        trimmed !== "" &&
        (!ALLOWED_SCHEMES.test(trimmed) || trimmed.length > MAX_URL_LENGTH)
      );
    })
  ) {
    res.status(400).json({ error: "invalid_images" });
    return;
  }

  const action = actionType as ActionType;
  const imagesArray = [
    ...new Set(
      (images as string[]).map((url) => url.trim()).filter((url) => url !== ""),
    ),
  ];
  const isEverywhere = Boolean(everywhere);

  try {
    if (isEverywhere) {
      await drizzleDb
        .update(actionData)
        .set({ images: imagesArray, updatedAt: new Date().toISOString() })
        .where(
          and(eq(actionData.userId, userId), eq(actionData.actionType, action)),
        );
    } else {
      if (typeof guildId !== "string" || !/^\d+$/.test(guildId)) {
        res.status(400).json({ error: "invalid_guildId" });
        return;
      }

      // Presence check: user must have participated in this guild for at least
      // one action before they are allowed to set images there.
      const presenceRows: any[] = await drizzleDb
        .select()
        .from(actionData)
        .where(
          and(
            eq(actionData.userId, userId),
            eq(actionData.locationId, guildId),
          ),
        )
        .limit(1);

      if (presenceRows.length === 0) {
        res.status(404).json({ error: "not_found" });
        return;
      }

      // Look up the specific action row for this guild.
      const rows: any[] = await drizzleDb
        .select()
        .from(actionData)
        .where(
          and(
            eq(actionData.userId, userId),
            eq(actionData.locationId, guildId),
            eq(actionData.actionType, action),
          ),
        )
        .limit(1);

      if (rows.length > 0) {
        await drizzleDb
          .update(actionData)
          .set({ images: imagesArray, updatedAt: new Date().toISOString() })
          .where(eq(actionData.id, rows[0].id));
      } else {
        await drizzleDb.insert(actionData).values({
          userId,
          locationId: guildId,
          actionType: action,
          hasPerformed: 0,
          hasReceived: 0,
          images: imagesArray,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }
    }

    res.json({ ok: true });
  } catch (err) {
    logger.error({ err }, "setImages: failed to update images");
    res.status(500).json({ error: "server_error" });
  }
}
