import { drizzleDb } from "../../db/connector.js";
import { actionData } from "../../db/schema.js";
import { eq, and } from "drizzle-orm";
import { ACTIONS, type ActionType } from "../../types/constants.js";
import logger from "../../logger.js";

export default async function setImagesHandler(req: any, res: any) {
  if (req.method !== "POST") {
    res.writeHead(405, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "method_not_allowed" }));
    return;
  }

  let body: string;
  try {
    body = await new Promise<string>((resolve, reject) => {
      let data = "";
      req.on("data", (chunk: Buffer) => {
        data += chunk.toString();
      });
      req.on("end", () => resolve(data));
      req.on("error", reject);
    });
  } catch {
    res.writeHead(400, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "bad_request" }));
    return;
  }

  let payload: {
    userId?: unknown;
    guildId?: unknown;
    actionType?: unknown;
    images?: unknown;
    everywhere?: unknown;
  };
  try {
    payload = JSON.parse(body);
  } catch {
    res.writeHead(400, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "invalid_json" }));
    return;
  }

  const { userId, guildId, actionType, images, everywhere } = payload;

  if (typeof userId !== "string" || !/^\d+$/.test(userId)) {
    res.writeHead(400, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "invalid_userId" }));
    return;
  }

  if (typeof actionType !== "string" || !(actionType in ACTIONS)) {
    res.writeHead(400, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "invalid_actionType" }));
    return;
  }

  const MAX_URL_LENGTH = 2048;
  const ALLOWED_SCHEMES = /^https?:\/\//i;

  if (
    !Array.isArray(images) ||
    images.length > 4 ||
    images.some((img) => {
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
    res.writeHead(400, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "invalid_images" }));
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
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "invalid_guildId" }));
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
        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "not_found" }));
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

    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: true }));
  } catch (err) {
    logger.error({ err }, "setImages: failed to update images");
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "server_error" }));
  }
}
