import {
  sqliteTable,
  uniqueIndex,
  text,
  integer,
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
    images: text("images", { mode: "json" }).default("[]").$type<string[]>(),
    createdAt: text().notNull(),
    updatedAt: text().notNull(),
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
  createdAt: text().notNull(),
  updatedAt: text().notNull(),
  sleepImage: text("sleep_image"),
  defaultImages: text("default_images", { mode: "json" })
    .default("[]")
    .$type<Record<string, string>>(),
});

export const userSessions = sqliteTable("userSessions", {
  userId: text("user_id").primaryKey(),
  guilds: text("guilds", { mode: "json" }).default("[]").$type<string[]>(),
  createdAt: text().notNull(),
  updatedAt: text().notNull(),
});
