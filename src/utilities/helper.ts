import { ActionUser } from "../types/user.js";
import { GuildMember, RGBTuple, User } from "discord.js";
import { drizzleDb } from "../db/connector.js";
import { actionData } from "../db/schema.js";
import { sql, eq, and } from "drizzle-orm";

export function hexToRGBTuple(hex: string) {
  hex = hex.replace("#", "");

  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);

  return [r, g, b] as RGBTuple;
}

export function randomImage(target: ActionUser) {
  return target.images[Math.floor(Math.random() * target.images.length)];
}

export function getName(user: User | GuildMember) {
  return user instanceof User ? user.username : user.displayName;
}

export function getAccentColor(user: User | GuildMember) {
  let accentColor =
    user instanceof GuildMember
      ? hexToRGBTuple(user.displayHexColor)
      : user.accentColor;

  if (accentColor === null || accentColor === undefined) {
    accentColor = hexToRGBTuple("#000000");
  }

  return accentColor;
}

import { ACTIONS } from "../types/constants.js";

async function fetchStatsInternal(locationId?: string) {
  const isLocal = Boolean(locationId);

  try {
    const actionKinds = Object.keys(ACTIONS);

    const sums = await Promise.all(
      actionKinds.map((k) =>
        (async () => {
          const whereClauses: any[] = [eq(actionData.actionType, k)];
          if (isLocal && locationId) {
            whereClauses.push(eq(actionData.locationId, locationId));
          }
          const r: any = await drizzleDb
            .select({ s: sql`SUM(${actionData.hasPerformed})` })
            .from(actionData)
            .where(and(...whereClauses));
          return Number(r?.[0]?.s ?? 0);
        })(),
      ),
    );

    let uniqueGuilds: number;
    if (isLocal) {
      // For a single location, COUNT(DISTINCT location_id) will always be 0 or 1.
      // Instead do a lightweight presence check and set totalLocations to 1 when any rows exist.
      const rPresence: any = await drizzleDb
        .select({ c: sql`COUNT(*)` })
        .from(actionData)
        .where(eq(actionData.locationId, locationId!));
      const presence = Number(rPresence?.[0]?.c ?? 0);
      uniqueGuilds = presence > 0 ? 1 : 0;
    } else {
      const r: any = await drizzleDb
        .select({
          uniqueGuilds: sql`COUNT(DISTINCT ${actionData.locationId})`,
        })
        .from(actionData);
      uniqueGuilds = Number(r?.[0]?.uniqueGuilds ?? 0);
    }

    const counts = await Promise.all(
      actionKinds.map((k) =>
        (async () => {
          const whereClauses: any[] = [
            eq(actionData.actionType, k),
            sql`${actionData.hasPerformed} > 0`,
          ];
          if (isLocal && locationId) {
            whereClauses.push(eq(actionData.locationId, locationId));
          }
          const r: any = await drizzleDb
            .select({ cnt: sql`COUNT(DISTINCT ${actionData.userId})` })
            .from(actionData)
            .where(and(...whereClauses));
          return Number(r?.[0]?.cnt ?? 0);
        })(),
      ),
    );

    const totalsByAction: Record<
      string,
      { totalHasPerformed: number; totalUsers: number }
    > = {};
    actionKinds.forEach((k, i) => {
      totalsByAction[k] = {
        totalHasPerformed: Number(sums[i]) || 0,
        totalUsers: Number(counts[i]) || 0,
      };
    });

    return {
      totalsByAction,
      totalLocations: Number(uniqueGuilds) || 0,
    };
  } catch (error) {
    console.error(
      isLocal ? "Error fetching local stats:" : "Error fetching global stats:",
      error,
    );

    const actionKinds = Object.keys(ACTIONS);
    const totalsByAction: Record<
      string,
      { totalHasPerformed: number; totalUsers: number }
    > = {};
    actionKinds.forEach((k) => {
      totalsByAction[k] = { totalHasPerformed: 0, totalUsers: 0 };
    });

    return {
      totalsByAction,
      totalLocations: 0,
    };
  }
}

export async function fetchGlobalStats() {
  return fetchStatsInternal();
}

export async function fetchStatsForLocation(locationId: string) {
  return fetchStatsInternal(locationId);
}
