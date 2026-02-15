import { ActionData, BotData } from "../../utilities/db.js";
import { Op } from "sequelize";
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
      const rows = await ActionData.findAll({
        attributes: ["location_id"],
        where: { user_id: userId, location_id: { [Op.not]: null } },
        group: ["location_id"],
      });

      const guildIds = rows
        .map((r: any) => r.get("location_id") as string)
        .filter(Boolean);

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ guildIds }));
      return;
    }

    // Default: return all guilds the bot knows about
    const rows = await BotData.findAll({ attributes: ["guild_id"] });
    const guildIds = rows
      .map((r: any) => r.get("guild_id") as string)
      .filter(Boolean);

    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ guildIds }));
  } catch (err) {
    logger.error({ err }, "/api/guilds error");
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "server_error" }));
  }
}
