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

export async function fetchGlobalStats() {
  try {
    const results = await Promise.all([
      ActionData.sum("has_performed", { where: { action_type: "pet" } }),
      ActionData.sum("has_performed", { where: { action_type: "bite" } }),
      sequelize
        .query(
          `SELECT COUNT(DISTINCT location_id) as uniqueGuilds FROM actionData`,
          { type: QueryTypes.SELECT },
        )
        .then((result: any) => result[0].uniqueGuilds),
      ActionData.count({
        distinct: true,
        col: "user_id",
        where: {
          action_type: "pet",
          has_performed: { [Op.gt]: 0 },
        },
      }),
      ActionData.count({
        distinct: true,
        col: "user_id",
        where: {
          action_type: "bite",
          has_performed: { [Op.gt]: 0 },
        },
      }),
    ]);

    return {
      totalHasPet: Number(results[0]) || 0,
      totalHasBitten: Number(results[1]) || 0,
      totalLocations: Number(results[2]) || 0,
      totalPetUsers: Number(results[3]) || 0,
      totalBiteUsers: Number(results[4]) || 0,
    };
  } catch (error) {
    console.error("Error fetching global stats:", error);
    return {
      totalHasPet: 0,
      totalHasBitten: 0,
      totalLocations: 0,
      totalPetUsers: 0,
      totalBiteUsers: 0,
    };
  }
}
