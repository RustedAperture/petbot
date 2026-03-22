import { isGuildAdmin } from "../../utilities/helper.js";
import { drizzleDb } from "../../db/connector.js";
import { botData } from "../../db/schema.js";
import { eq } from "drizzle-orm";
import { Client } from "discord.js";
import { HttpMethod } from "../../types/constants.js";
import type { GuildSettings } from "../../types/guild.js";
import http from "node:http";
import logger from "../../logger.js";
import { isAllowedMethod, parseJsonBody } from "../../utilities/httpHelper.js";

export interface ServerSettingsResponse {
  settings: Partial<GuildSettings>;
}

export default async function serverSettingsHandler(
  req: http.IncomingMessage,
  res: http.ServerResponse,
  client: Client<boolean>,
) {
  const method = (req.method || "") as HttpMethod;
  const supportedMethods = [HttpMethod.GET, HttpMethod.PATCH] as const;

  if (!isAllowedMethod(method, supportedMethods, res)) {
    return;
  }

  const url = new URL(
    req.url || "",
    `http://${req.headers.host || "localhost"}`,
  );
  const guildId = url.searchParams.get("guildId");
  const userId = url.searchParams.get("userId");

  if (!guildId || !userId) {
    const missingParam = !guildId ? "guildId" : "userId";
    res.writeHead(400, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: `missing parameter: ${missingParam}` }));
    return;
  }

  const isAdmin = await isGuildAdmin(client, guildId, userId);

  if (!isAdmin) {
    res.writeHead(403, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "forbidden" }));
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
      })
      .from(botData)
      .where(eq(botData.guildId, guildId))
      .limit(1);
  } catch (err) {
    logger.error({ err }, "Error fetching server settings rows");
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        error: "server_error",
        reason: "fetch_settings_failed",
        details: err instanceof Error ? err.message : String(err),
      }),
    );
    return;
  }

  if (settingsRows.length === 0) {
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "not_found" }));
    return;
  }

  try {
    if (method === "GET") {
      const responseData: ServerSettingsResponse = {
        settings: settingsRows[0] as Partial<GuildSettings>,
      };

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(responseData));
    } else if (method === "PATCH") {
      let rawBody: unknown;
      try {
        rawBody = await parseJsonBody<unknown>(req);
      } catch (err) {
        logger.error({ err }, "Error parsing request body");
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            error: "invalid_json",
            reason: "parse_json_failed",
            details: err instanceof Error ? err.message : String(err),
          }),
        );
        return;
      }

      if (
        typeof rawBody !== "object" ||
        rawBody === null ||
        Array.isArray(rawBody)
      ) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            error: "invalid_payload",
            reason: "body_must_be_object",
          }),
        );
        return;
      }

      const body = rawBody as Record<string, unknown>;
      const allowedKeys = [
        "logChannel",
        "nickname",
        "sleepImage",
        "defaultImages",
        "restricted",
        "updatedAt",
      ];
      const invalidKeys = Object.keys(body).filter(
        (key) => !allowedKeys.includes(key),
      );

      if (invalidKeys.length > 0) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            error: "invalid_update_keys",
            reason: "update_keys_not_allowed",
            details: invalidKeys,
          }),
        );
        return;
      }

      const sanitizedBody: Partial<GuildSettings> = {};
      for (const key of allowedKeys) {
        if (key in body) {
          sanitizedBody[key as keyof GuildSettings] = body[key] as any;
        }
      }

      const mergedSettings: Partial<GuildSettings> = {
        ...settingsRows[0],
        ...sanitizedBody,
        updatedAt: new Date().toISOString(),
      };

      try {
        await drizzleDb
          .update(botData)
          .set(mergedSettings)
          .where(eq(botData.guildId, guildId));
      } catch (err) {
        logger.error({ err }, "Error updating server settings");
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            error: "update_failed",
            reason: "db_update_failed",
            details: err instanceof Error ? err.message : String(err),
          }),
        );
        return;
      }

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ success: true, settings: mergedSettings }));
    }
  } catch (err) {
    logger.error({ err }, "Error fetching server settings");
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        error: "server_error",
        reason: "unknown_error",
        details: err instanceof Error ? err.message : String(err),
      }),
    );
  }

  return;
}
