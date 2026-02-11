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

export async function fetchGlobalStats() {
  try {
    const actionKinds = Object.keys(ACTIONS);

    const sums = await Promise.all(
      actionKinds.map((k) =>
        ActionData.sum("has_performed", { where: { action_type: k } }),
      ),
    );

    const uniqueGuilds = await sequelize
      .query(
        `SELECT COUNT(DISTINCT location_id) as uniqueGuilds FROM actionData`,
        { type: QueryTypes.SELECT },
      )
      .then((result: any) => result[0].uniqueGuilds);

    const counts = await Promise.all(
      actionKinds.map((k) =>
        ActionData.count({
          distinct: true,
          col: "user_id",
          where: {
            action_type: k,
            has_performed: { [Op.gt]: 0 },
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
    console.error("Error fetching global stats:", error);

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

export async function fetchStatsForLocation(locationId: string) {
  try {
    const actionKinds = Object.keys(ACTIONS);

    const sums = await Promise.all(
      actionKinds.map((k) =>
        ActionData.sum("has_performed", {
          where: { action_type: k, location_id: locationId },
        }),
      ),
    );

    const uniqueGuilds = await sequelize
      .query(
        `SELECT COUNT(DISTINCT location_id) as uniqueGuilds FROM actionData WHERE location_id = :location`,
        { type: QueryTypes.SELECT, replacements: { location: locationId } },
      )
      .then((result: any) => result[0].uniqueGuilds);

    const counts = await Promise.all(
      actionKinds.map((k) =>
        ActionData.count({
          distinct: true,
          col: "user_id",
          where: {
            action_type: k,
            has_performed: { [Op.gt]: 0 },
            location_id: locationId,
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
    console.error("Error fetching local stats:", error);

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
