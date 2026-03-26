import type { Request, Response } from "express";
import { actionData, botData } from "../../db/schema.js";
import { drizzleDb } from "../../db/connector.js";
import { sql } from "drizzle-orm";

/**
 * GET /api/guilds — list all guild IDs the bot knows about.
 * GET /api/guilds/user/:userId — list guild IDs where a user has action data.
 */
export default async function guildsHandler(
  req: Request,
  res: Response,
): Promise<void> {
  const userId = req.params.userId as string | undefined;

  if (userId) {
    const rows = await drizzleDb
      .select({ location_id: actionData.locationId })
      .from(actionData)
      .where(
        sql`${actionData.userId} = ${userId} AND ${actionData.locationId} IS NOT NULL`,
      )
      .groupBy(actionData.locationId);

    const guildIds = rows.map((r: any) => r.location_id).filter(Boolean);
    res.json({ guildIds });
    return;
  }

  // Default: return all guilds the bot knows about
  const rows = await drizzleDb
    .select({ guild_id: botData.guildId })
    .from(botData);
  const guildIds = rows.map((r: any) => r.guild_id).filter(Boolean);
  res.json({ guildIds });
}
