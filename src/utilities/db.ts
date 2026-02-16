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

const sequelize = new Sequelize("database", "user", "password", {
  host: "localhost",
  dialect: "sqlite",
  logging: false,

  storage: "data/database.sqlite",
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

// Per-user persisted session info (server-side storage for user guilds / metadata)
class UserSession extends Model {
  declare user_id: string;
  declare guilds?: any[] | null;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

UserSession.init(
  {
    user_id: { type: DataTypes.STRING, primaryKey: true },
    guilds: DataTypes.JSON,
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
  },
  {
    sequelize,
    modelName: "userSession",
  },
);

export { ActionData, BotData, UserSession, sequelize };
