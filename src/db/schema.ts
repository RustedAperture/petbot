import {
  sqliteTable,
  uniqueIndex,
  index,
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
    index("action_data_location_action_idx").on(
      table.locationId,
      table.actionType,
    ),
    index("action_data_action_type_idx").on(table.actionType),
  ],
);

export const botData = sqliteTable(
  "botData",
  {
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
    restricted: integer("restricted", { mode: "boolean" }).default(false),
  },
  // Not unique: existing databases may already hold duplicate guild rows, and a
  // unique index would fail the migration at startup.
  (table) => [index("bot_data_guild_id_idx").on(table.guildId)],
);

export const userSessions = sqliteTable("userSessions", {
  userId: text("user_id").primaryKey(),
  guilds: text("guilds", { mode: "json" }).default("[]").$type<string[]>(),
  createdAt: text().notNull(),
  updatedAt: text().notNull(),
});

export const optOut = sqliteTable("optOut", {
  userId: text("user_id").primaryKey(),
  createdAt: text().notNull(),
  updatedAt: text().notNull(),
});

export const leaderboardConsent = sqliteTable("leaderboardConsent", {
  hashedUserId: text("hashed_user_id").primaryKey(),
  displayName: text("display_name").notNull(),
  createdAt: text().notNull(),
  updatedAt: text().notNull(),
});

export const actionEvents = sqliteTable(
  "action_events",
  {
    id: integer().primaryKey({ autoIncrement: true }),
    actionType: text("action_type").notNull(),
    performerHash: text("performer_hash").notNull(),
    targetHash: text("target_hash").notNull(),
    locationId: text("location_id"),
    phrase: text("phrase"),
    phraseSource: text("phrase_source").$type<"guild" | "user">(),
    createdAt: text("created_at").notNull(),
  },
  (table) => [
    index("action_events_created_at_idx").on(table.createdAt),
    index("action_events_location_created_idx").on(
      table.locationId,
      table.createdAt,
    ),
    index("action_events_performer_idx").on(table.performerHash),
    index("action_events_target_idx").on(table.targetHash),
  ],
);

export const customActions = sqliteTable(
  "custom_actions",
  {
    id: integer().primaryKey({ autoIncrement: true }),
    name: text().notNull(),
    phrase: text().notNull(),
    scope: text().notNull().$type<"guild" | "user">(),
    ownerId: text("owner_id").notNull(),
    image: text(),
    createdBy: text("created_by"),
    createdAt: text().notNull(),
    updatedAt: text().notNull(),
  },
  (table) => [
    uniqueIndex("custom_actions_scope_owner_name_unique").on(
      table.scope,
      table.ownerId,
      table.name,
    ),
    index("custom_actions_name_idx").on(table.name),
  ],
);

export const customActionBans = sqliteTable("custom_action_bans", {
  userId: text("user_id").primaryKey(),
  createdAt: text().notNull(),
  reason: text(),
});
