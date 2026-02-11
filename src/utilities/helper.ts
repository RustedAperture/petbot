import { ActionUser } from "../types/user.js";
import { GuildMember, RGBTuple, User } from "discord.js";
import { sequelize, ActionData } from "./db.js";
import { Op, QueryTypes } from "sequelize";

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

  if (accentColor === null || accentColor === undefined)
    accentColor = hexToRGBTuple("#000000");

  return accentColor;
}

import { ACTIONS } from "../types/constants.js";

async function fetchStatsInternal(locationId?: string) {
  const isLocal = Boolean(locationId);

  try {
    const actionKinds = Object.keys(ACTIONS);

    const sums = await Promise.all(
      actionKinds.map((k) =>
        ActionData.sum("has_performed", {
          where: {
            action_type: k,
            ...(isLocal ? { location_id: locationId } : {}),
          },
        }),
      ),
    );

    let uniqueGuilds: number;
    if (isLocal) {
      // For a single location, COUNT(DISTINCT location_id) will always be 0 or 1.
      // Instead do a lightweight presence check and set totalLocations to 1 when any rows exist.
      const presence = await ActionData.count({
        where: { location_id: locationId },
      });
      uniqueGuilds = presence > 0 ? 1 : 0;
    } else {
      const uniqueGuildsResult: any = await sequelize.query(
        `SELECT COUNT(DISTINCT location_id) as uniqueGuilds FROM actionData`,
        { type: QueryTypes.SELECT },
      );
      uniqueGuilds = uniqueGuildsResult[0].uniqueGuilds;
    }

    const counts = await Promise.all(
      actionKinds.map((k) =>
        ActionData.count({
          distinct: true,
          col: "user_id",
          where: {
            action_type: k,
            has_performed: { [Op.gt]: 0 },
            ...(isLocal ? { location_id: locationId } : {}),
          },
        }),
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
