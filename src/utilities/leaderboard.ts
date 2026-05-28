import type { Client, Guild } from "discord.js";
import { drizzleDb } from "../db/connector.js";
import { actionData, leaderboardConsent } from "../db/schema.js";
import { eq, and, desc, sum, gt, inArray, type SQL } from "drizzle-orm";
import { hashUserId } from "./crypto.js";

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  displayName: string | null;
  anonymousLabel: string;
  totalActions: number;
}

export interface LeaderboardResult {
  locationId: string | null;
  actionType: string | null;
  entries: LeaderboardEntry[];
}

export async function getLeaderboard(opts: {
  locationId?: string;
  actionType?: string;
  limit?: number;
  discordClient: Client;
}): Promise<LeaderboardResult> {
  const { locationId, actionType, limit = 10, discordClient } = opts;

  const whereClauses: SQL[] = [];
  if (locationId) {
    whereClauses.push(eq(actionData.locationId, locationId));
  }
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
    .having(gt(sum(actionData.hasPerformed), 0))
    .orderBy(desc(sum(actionData.hasPerformed)))
    .limit(Math.min(limit, 25));

  const entries: LeaderboardEntry[] = [];

  // Only resolve display names when scoped to a specific guild
  let guild: Guild | null = null;
  if (locationId) {
    try {
      guild = await discordClient.guilds.fetch(locationId);
    } catch {
      // bot may not be in this guild
    }
  }

  const displayNameByUserId = new Map<string, string | null>();
  if (guild && rows.length > 0) {
    const userIds = rows.map((r) => r.userId);
    try {
      const members = await guild.members.fetch({ user: userIds });
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

  // Look up consent records for all hashed user IDs
  const consentDisplayNames = new Map<string, string>();
  try {
    const hashedIds = rows.map((r) => hashUserId(r.userId));
    const consentRows = await drizzleDb
      .select({
        hashedUserId: leaderboardConsent.hashedUserId,
        displayName: leaderboardConsent.displayName,
      })
      .from(leaderboardConsent)
      .where(inArray(leaderboardConsent.hashedUserId, hashedIds));
    for (const row of consentRows) {
      consentDisplayNames.set(row.hashedUserId, row.displayName);
    }
  } catch {
    // failed to fetch consent, proceed without display names
  }

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const hashed = hashUserId(row.userId);
    const consentName = consentDisplayNames.get(hashed) ?? null;
    const displayName = consentName ?? displayNameByUserId.get(row.userId) ?? null;

    entries.push({
      rank: i + 1,
      userId: row.userId,
      displayName,
      anonymousLabel: hashed,
      totalActions: row.totalActions ?? 0,
    });
  }

  return { locationId: locationId ?? null, actionType: actionType ?? null, entries };
}
