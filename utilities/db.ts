import { Sequelize, DataTypes, Model } from "sequelize";
import { BiteUser, PetUser } from "../types/user.js";


interface GuildData {
  id: number;
  guild_id: string;
  default_pet_image: string;
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

class PetData extends Model<PetUser> implements PetUser {
  declare readonly id: number;
  declare user_id: string;
  declare guild_id: string;
  declare images: string[];
  declare has_pet: number;
  declare has_been_pet: number;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}
PetData.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    user_id: DataTypes.STRING,
    guild_id: DataTypes.STRING,
    images: DataTypes.JSON,
    has_pet: DataTypes.INTEGER,
    has_been_pet: DataTypes.INTEGER,
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
  },
  {
    sequelize,
    modelName: "petData",
  },
);

class BiteData extends Model<BiteUser> implements BiteUser {
  declare readonly id: number;
  declare user_id: string;
  declare guild_id: string;
  declare images: string[];
  declare has_bitten: number;
  declare has_been_bitten: number;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

BiteData.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    user_id: DataTypes.STRING,
    guild_id: DataTypes.STRING,
    images: DataTypes.JSON,
    has_bitten: DataTypes.INTEGER,
    has_been_bitten: DataTypes.INTEGER,
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
  },
  {
    sequelize,
    modelName: "biteData",
  },
);

class BotData extends Model<GuildData> implements GuildData {
  declare readonly id: number;
  declare guild_id: string;
  declare default_pet_image: string;
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
    default_pet_image: DataTypes.TEXT,
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

export { PetData, BotData, BiteData, sequelize };
