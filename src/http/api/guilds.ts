import { actionData, botData } from "../../db/schema.js";
import { drizzleDb } from "../../db/connector.js";
import { sql } from "drizzle-orm";
import logger from "../../logger.js";

export default async function guildsHandler(req: any, res: any) {
  if (req.method !== "GET") {
    res.writeHead(405, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "method_not_allowed" }));
    return;
  }

  try {
    const url = new URL(
      req.url || "",
      `http://${req.headers.host || "localhost"}`,
    );
    const userId = url.searchParams.get("userId");

    // If a userId is provided, return only guild/location ids where that user has action data
    if (userId) {
      const rows = await drizzleDb
        .select({ location_id: actionData.locationId })
        .from(actionData)
        .where(
          sql`${actionData.userId} = ${userId} AND ${actionData.locationId} IS NOT NULL`,
        )
        .groupBy(actionData.locationId);

      const guildIds = rows.map((r: any) => r.location_id).filter(Boolean);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ guildIds }));
      return;
    }

    // Default: return all guilds the bot knows about
    const rows = await drizzleDb
      .select({ guild_id: botData.guildId })
      .from(botData);
    const guildIds = rows.map((r: any) => r.guild_id).filter(Boolean);
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ guildIds }));
  } catch (err) {
    logger.error({ err }, "/api/guilds error");
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "server_error" }));
  }
}
