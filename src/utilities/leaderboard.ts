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
  currentUserId?: string;
  discordClient: Client;
}): Promise<LeaderboardResult> {
  const { locationId, actionType, limit = 10, currentUserId, discordClient } = opts;

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

  if (rows.length === 0) {
    return { locationId: locationId ?? null, actionType: actionType ?? null, entries: [] };
  }

  // Resolve guild display names when scoped to a specific guild
  const displayNameByUserId = new Map<string, string | null>();
  if (locationId) {
    try {
      const guild: Guild = await discordClient.guilds.fetch(locationId);
      const members = await guild.members.fetch({ user: rows.map((r) => r.userId) });
      for (const [userId, member] of members) {
        displayNameByUserId.set(
          userId,
          member.displayName ?? member.user.displayName ?? null,
        );
      }
    } catch {
      // bot may not be in this guild, or failed to fetch members
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

  const entries: LeaderboardEntry[] = rows.map((row, i) => {
    const hashed = hashUserId(row.userId);
    const consentName = consentDisplayNames.get(hashed) ?? null;
    const displayName = consentName ?? displayNameByUserId.get(row.userId) ?? null;

    return {
      rank: i + 1,
      userId: row.userId,
      displayName,
      anonymousLabel: hashed.slice(0, 6),
      totalActions: row.totalActions ?? 0,
    };
  });

  // If current user is not in the top N, add them at the bottom
  if (currentUserId && !entries.some((e) => e.userId === currentUserId)) {
    try {
      const userRows = await drizzleDb
        .select({
          totalActions: sum(actionData.hasPerformed).mapWith(Number),
        })
        .from(actionData)
        .where(and(...whereClauses, eq(actionData.userId, currentUserId)))
        .groupBy(actionData.userId)
        .having(gt(sum(actionData.hasPerformed), 0));

      const userTotal = userRows[0]?.totalActions ?? 0;

      if (userTotal > 0) {
        // Count how many have more actions to determine rank
        const rankRows = await drizzleDb
          .select({
            count: sum(actionData.hasPerformed).mapWith(Number),
          })
          .from(actionData)
          .where(and(...whereClauses))
          .groupBy(actionData.userId)
          .having(gt(sum(actionData.hasPerformed), userTotal));

        const rank = rankRows.length + 1;

        const hashed = hashUserId(currentUserId);
        let displayName = consentDisplayNames.get(hashed) ?? null;

        // Look up consent specifically if not in the top N map
        if (!displayName) {
          try {
            const consentRow = await drizzleDb
              .select({ displayName: leaderboardConsent.displayName })
              .from(leaderboardConsent)
              .where(eq(leaderboardConsent.hashedUserId, hashed))
              .limit(1);
            if (consentRow.length > 0) {
              displayName = consentRow[0].displayName;
            }
          } catch {
            // failed to fetch consent
          }
        }

        // Try guild display name if not consented
        if (!displayName && locationId) {
          try {
            const guild: Guild = await discordClient.guilds.fetch(locationId);
            const member = await guild.members.fetch(currentUserId);
            displayName = member.displayName ?? member.user.displayName ?? null;
          } catch {
            // couldn't resolve guild name
          }
        }

        entries.push({
          rank,
          userId: currentUserId,
          displayName,
          anonymousLabel: hashed.slice(0, 6),
          totalActions: userTotal,
        });
      }
    } catch {
      // failed to include current user, proceed without
    }
  }

  return { locationId: locationId ?? null, actionType: actionType ?? null, entries };
}
