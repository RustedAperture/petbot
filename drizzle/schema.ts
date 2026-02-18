import {
  sqliteTable,
  uniqueIndex,
  text,
  integer,
  customType,
  numeric,
} from "drizzle-orm/sqlite-core";

export const sequelizeMeta = sqliteTable("SequelizeMeta", {
  name: text().primaryKey(),
});

export const actionData = sqliteTable(
  "actionData",
  {
    id: integer().primaryKey({ autoIncrement: true }),
    userId: text("user_id").notNull(),
    locationId: text("location_id"),
    actionType: text("action_type").notNull(),
    hasPerformed: integer("has_performed").default(0),
    hasReceived: integer("has_received").default(0),
    images: customType({ dataType: () => "JSON" })(),
    createdAt: numeric(),
    updatedAt: numeric(),
  },
  (table) => [
    uniqueIndex("action_data_unique_constraint").on(
      table.userId,
      table.locationId,
      table.actionType,
    ),
  ],
);

export const botData = sqliteTable("botData", {
  id: integer().primaryKey(),
  guildId: text("guild_id"),
  logChannel: text("log_channel"),
  nickname: text(),
  createdAt: numeric().notNull(),
  updatedAt: numeric().notNull(),
  sleepImage: text("sleep_image"),
  defaultImages: customType({ dataType: () => "JSON" })(
    "default_images",
  ).default("NULL"),
});

export const userSessions = sqliteTable("userSessions", {
  userId: text("user_id").primaryKey(),
  guilds: customType({ dataType: () => "JSON" })(),
  createdAt: numeric().notNull(),
  updatedAt: numeric().notNull(),
});
