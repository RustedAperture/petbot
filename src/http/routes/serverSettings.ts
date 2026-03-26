import { Router } from "express";
import type { Request, Response } from "express";
import type { Client } from "discord.js";
import { isGuildAdmin } from "../../utilities/helper.js";
import { drizzleDb } from "../../db/connector.js";
import { botData } from "../../db/schema.js";
import { eq } from "drizzle-orm";
import type { GuildSettings } from "../../types/guild.js";
import logger from "../../logger.js";

export interface ServerSettingsResponse {
  settings: Partial<GuildSettings>;
}

const ALLOWED_KEYS = [
  "logChannel",
  "nickname",
  "sleepImage",
  "defaultImages",
  "restricted",
];

const STRING_FIELDS = ["logChannel", "nickname", "sleepImage"] as const;

/**
 * Create a router for /api/serverSettings/:guildId/userId/:userId.
 * Requires Discord client context via closure.
 */
export default function serverSettingsRouter(client: Client<boolean>) {
  const router = Router();

  /**
   * Shared guard: verify guild admin access.
   * Returns true if authorized, false if rejected (response already sent).
   */
  async function requireAdmin(req: Request, res: Response): Promise<boolean> {
    const guildId = req.params.guildId as string;
    const userId = req.params.userId as string;

    const isAdmin = await isGuildAdmin(client, guildId, userId);
    if (!isAdmin) {
      res.status(403).json({ error: "forbidden" });
      return false;
    }
    return true;
  }

  /**
   * GET /api/serverSettings/:guildId/userId/:userId — fetch guild settings.
   */
  router.get(
    "/:guildId/userId/:userId",
    async (req: Request, res: Response) => {
      const guildId = req.params.guildId as string;

      if (!(await requireAdmin(req, res))) {
        return;
      }

      let settingsRows;
      try {
        settingsRows = await drizzleDb
          .select({
            logChannel: botData.logChannel,
            nickname: botData.nickname,
            sleepImage: botData.sleepImage,
            defaultImages: botData.defaultImages,
            restricted: botData.restricted,
            updatedAt: botData.updatedAt,
          })
          .from(botData)
          .where(eq(botData.guildId, guildId))
          .limit(1);
      } catch (err) {
        logger.error({ err }, "Error fetching server settings rows");
        res.status(500).json({
          error: "server_error",
          reason: "fetch_settings_failed",
          details: err instanceof Error ? err.message : String(err),
        });
        return;
      }

      if (settingsRows.length === 0) {
        res.status(404).json({ error: "not_found" });
        return;
      }

      const responseData: ServerSettingsResponse = {
        settings: settingsRows[0] as Partial<GuildSettings>,
      };
      res.json(responseData);
    },
  );

  /**
   * PATCH /api/serverSettings/:guildId/userId/:userId — update guild settings.
   */
  router.patch(
    "/:guildId/userId/:userId",
    async (req: Request, res: Response) => {
      const guildId = req.params.guildId as string;

      if (!(await requireAdmin(req, res))) {
        return;
      }

      // Fetch current settings for merge response
      let settingsRows;
      try {
        settingsRows = await drizzleDb
          .select({
            logChannel: botData.logChannel,
            nickname: botData.nickname,
            sleepImage: botData.sleepImage,
            defaultImages: botData.defaultImages,
            restricted: botData.restricted,
            updatedAt: botData.updatedAt,
          })
          .from(botData)
          .where(eq(botData.guildId, guildId))
          .limit(1);
      } catch (err) {
        logger.error({ err }, "Error fetching server settings rows");
        res.status(500).json({
          error: "server_error",
          reason: "fetch_settings_failed",
          details: err instanceof Error ? err.message : String(err),
        });
        return;
      }

      if (settingsRows.length === 0) {
        res.status(404).json({ error: "not_found" });
        return;
      }

      const rawBody = req.body;

      if (
        typeof rawBody !== "object" ||
        rawBody === null ||
        Array.isArray(rawBody)
      ) {
        res
          .status(400)
          .json({ error: "invalid_payload", reason: "body_must_be_object" });
        return;
      }

      const body = rawBody as Record<string, unknown>;
      const invalidKeys = Object.keys(body).filter(
        (key) => !ALLOWED_KEYS.includes(key),
      );

      if (invalidKeys.length > 0) {
        res.status(400).json({
          error: "invalid_update_keys",
          reason: "update_keys_not_allowed",
          details: invalidKeys,
        });
        return;
      }

      // Validate field types
      if ("restricted" in body) {
        const val = body.restricted;
        if (typeof val !== "boolean" && typeof val !== "number") {
          res
            .status(400)
            .json({ error: "invalid_field_type", field: "restricted" });
          return;
        }
      }

      if ("defaultImages" in body) {
        const val = body.defaultImages;
        if (val === null || typeof val !== "object" || Array.isArray(val)) {
          res
            .status(400)
            .json({ error: "invalid_field_type", field: "defaultImages" });
          return;
        }
        const mapping = val as Record<string, unknown>;
        for (const value of Object.values(mapping)) {
          if (typeof value !== "string") {
            res
              .status(400)
              .json({ error: "invalid_field_type", field: "defaultImages" });
            return;
          }
        }
      }

      for (const field of STRING_FIELDS) {
        if (field in body && typeof body[field] !== "string") {
          res.status(400).json({ error: "invalid_field_type", field });
          return;
        }
      }

      // Build sanitized update
      const sanitizedBody: Partial<GuildSettings> = {};
      if ("logChannel" in body) {
        sanitizedBody.logChannel = body.logChannel as string;
      }
      if ("nickname" in body) {
        sanitizedBody.nickname = body.nickname as string;
      }
      if ("sleepImage" in body) {
        sanitizedBody.sleepImage = body.sleepImage as string;
      }
      if ("defaultImages" in body) {
        sanitizedBody.defaultImages = body.defaultImages as Record<
          string,
          string
        >;
      }
      if ("restricted" in body) {
        sanitizedBody.restricted =
          typeof body.restricted === "number"
            ? Boolean(body.restricted)
            : (body.restricted as boolean);
      }

      if (Object.keys(sanitizedBody).length === 0) {
        res
          .status(400)
          .json({ error: "invalid_payload", reason: "no_fields_to_update" });
        return;
      }

      const updatedAt = new Date().toISOString();
      const dbUpdateData: Partial<GuildSettings> = {
        ...sanitizedBody,
        updatedAt,
      };

      try {
        await drizzleDb
          .update(botData)
          .set(dbUpdateData)
          .where(eq(botData.guildId, guildId));
      } catch (err) {
        logger.error({ err }, "Error updating server settings");
        res.status(500).json({
          error: "update_failed",
          reason: "db_update_failed",
          details: err instanceof Error ? err.message : String(err),
        });
        return;
      }

      const mergedSettings: Partial<GuildSettings> = {
        ...settingsRows[0],
        ...sanitizedBody,
        updatedAt,
      };

      res.json({ success: true, settings: mergedSettings });
    },
  );

  return router;
}
