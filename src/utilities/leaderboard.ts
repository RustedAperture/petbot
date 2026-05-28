import { createHash } from "node:crypto";
import { Client, Guild } from "discord.js";
import { drizzleDb } from "../db/connector.js";
import { actionData } from "../db/schema.js";
import { eq, and, desc, sum } from "drizzle-orm";

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  displayName: string | null;
  anonymousLabel: string;
  totalActions: number;
}

export interface LeaderboardResult {
  locationId: string;
  actionType: string | null;
  entries: LeaderboardEntry[];
}

function hashUserId(userId: string): string {
  return createHash("sha256").update(userId).digest("hex").slice(0, 4);
}

export async function getLeaderboard(opts: {
  locationId: string;
  actionType?: string;
  limit?: number;
  discordClient: Client;
}): Promise<LeaderboardResult> {
  const { locationId, actionType, limit = 10, discordClient } = opts;

  const whereClauses = [eq(actionData.locationId, locationId)];
  if (actionType) {
    whereClauses.push(eq(actionData.actionType, actionType));
  }

  const rows = await drizzleDb
    .select({
      userId: actionData.userId,
      totalActions: sum(actionData.hasPerformed).mapWith(Number),
    })
    .from(actionData)
    .where(and(...whereClauses))
    .groupBy(actionData.userId)
    .orderBy(desc(sum(actionData.hasPerformed)))
    .limit(Math.min(limit, 25));

  const entries: LeaderboardEntry[] = [];

  // Try to resolve display names from Discord
  let guild: Guild | null = null;
  try {
    guild = await discordClient.guilds.fetch(locationId);
  } catch {
    // bot may not be in this guild
  }

  // Pre-fetch all guild members in a single API call to avoid N+1 serial fetches
  const displayNameByUserId = new Map<string, string | null>();
  if (guild) {
    try {
      const members = await guild.members.fetch();
      for (const [userId, member] of members) {
        displayNameByUserId.set(
          userId,
          member.displayName ?? member.user.displayName ?? null,
        );
      }
    } catch {
      // failed to fetch members, proceed without display names
    }
  }

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const displayName = displayNameByUserId.get(row.userId) ?? null;

    entries.push({
      rank: i + 1,
      userId: row.userId,
      displayName,
      anonymousLabel: hashUserId(row.userId),
      totalActions: row.totalActions ?? 0,
    });
  }

  return { locationId, actionType: actionType ?? null, entries };
}
