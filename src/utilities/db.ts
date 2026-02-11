import { Sequelize, DataTypes, Model } from "sequelize";
import { ActionUser } from "../types/user.js";

interface GuildData {
  id: number;
  guild_id: string;
  default_images?: Record<string, string> | null;
  log_channel: string;
  nickname: string;
  sleep_image: string;
  createdAt: Date;
  updatedAt: Date;
}

import fs from "fs";
import path from "path";

const storagePath =
  process.env.DATABASE_STORAGE || path.join("data", "database.sqlite");

if (!fs.existsSync(storagePath)) {
  console.warn(
    `Database file not found at ${storagePath}. Stats will be empty until a database is present.`,
  );
} else {
  const stat = fs.statSync(storagePath);
  if (stat.size === 0) {
    console.warn(
      `Database file at ${storagePath} exists but is empty. Stats will be empty.`,
    );
  }
}

const sequelize = new Sequelize("database", "user", "password", {
  host: "localhost",
  dialect: "sqlite",
  logging: false,

  storage: storagePath,
});

class ActionData extends Model<ActionUser> implements ActionUser {
  declare readonly id: number;
  declare user_id: string;
  declare location_id: string | null;
  declare action_type: string;
  declare has_performed: number;
  declare has_received: number;
  declare images: string[];
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

ActionData.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    user_id: { type: DataTypes.STRING, allowNull: false },
    location_id: { type: DataTypes.STRING, allowNull: true },
    action_type: { type: DataTypes.STRING, allowNull: false },
    has_performed: { type: DataTypes.INTEGER, defaultValue: 0 },
    has_received: { type: DataTypes.INTEGER, defaultValue: 0 },
    images: DataTypes.JSON,
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
  },
  {
    sequelize,
    modelName: "actionData",
  },
);

class BotData extends Model<GuildData> implements GuildData {
  declare readonly id: number;
  declare guild_id: string;
  declare default_images?: Record<string, string> | null;
  declare log_channel: string;
  declare nickname: string;
  declare sleep_image: string;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

BotData.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    guild_id: DataTypes.STRING,
    default_images: DataTypes.JSON,
    log_channel: DataTypes.STRING,
    nickname: DataTypes.STRING,
    sleep_image: DataTypes.TEXT,
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
  },
  {
    sequelize,
    modelName: "botData",
  },
);

export { ActionData, BotData, sequelize };
