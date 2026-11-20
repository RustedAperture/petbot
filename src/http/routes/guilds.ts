import type { Request, Response } from "express";
import { actionData, botData, userSessions } from "../../db/schema.js";
import { drizzleDb } from "../../db/connector.js";
import { eq, inArray, sql } from "drizzle-orm";

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

/**
 * GET /api/guilds/member/:userId — list guild IDs the user is a member of
 * (per their persisted Discord session) that have action data from anyone.
 */
export async function memberGuildsHandler(
  req: Request,
  res: Response,
): Promise<void> {
  const userId = req.params.userId as string;

  const [session] = await drizzleDb
    .select({ guilds: userSessions.guilds })
    .from(userSessions)
    .where(eq(userSessions.userId, userId))
    .limit(1);

  // The login callback persists Discord's raw guild objects, not bare IDs.
  const sessionGuilds = (session?.guilds ?? []) as unknown as Array<{
    id?: string;
  }>;
  const memberGuildIds = sessionGuilds
    .map((g) => g?.id)
    .filter((id): id is string => Boolean(id));

  if (memberGuildIds.length === 0) {
    res.json({ guildIds: [] });
    return;
  }

  const rows = await drizzleDb
    .selectDistinct({ locationId: actionData.locationId })
    .from(actionData)
    .where(inArray(actionData.locationId, memberGuildIds));

  res.json({ guildIds: rows.map((r) => r.locationId) });
}
