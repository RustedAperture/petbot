import { isGuildAdmin } from "@utils/helper.js";
import { drizzleDb } from "@db/connector.js";
import { botData } from "@db/schema.js";
import { eq } from "drizzle-orm";
import { Client } from "discord.js";
import http from "node:http";
import logger from "@logger";

export default async function serverSettingsHandler(
  req: http.IncomingMessage,
  res: http.ServerResponse,
  client: Client<boolean>,
) {
  const supportedMethods = ["GET"];

  const method = req.method || "";
  if (!supportedMethods.includes(method)) {
    res.writeHead(405, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "method_not_allowed" }));
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

  try {
    const settingsRows = await drizzleDb
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

    if (settingsRows.length === 0) {
      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "not_found" }));
      return;
    }

    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ settings: settingsRows[0] }));
  } catch (err) {
    logger.error({ err }, "Error fetching server settings");
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "server_error" }));
  }

  return;
}
