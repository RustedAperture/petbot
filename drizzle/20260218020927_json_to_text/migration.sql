PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_actionData` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`user_id` text NOT NULL,
	`location_id` text,
	`action_type` text NOT NULL,
	`has_performed` integer DEFAULT 0,
	`has_received` integer DEFAULT 0,
	`images` text DEFAULT '[]',
	`createdAt` text NOT NULL,
	`updatedAt` text NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_actionData`(`id`, `user_id`, `location_id`, `action_type`, `has_performed`, `has_received`, `images`, `createdAt`, `updatedAt`) SELECT `id`, `user_id`, `location_id`, `action_type`, `has_performed`, `has_received`, `images`, `createdAt`, `updatedAt` FROM `actionData`;--> statement-breakpoint
DROP TABLE `actionData`;--> statement-breakpoint
ALTER TABLE `__new_actionData` RENAME TO `actionData`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_botData` (
	`id` integer PRIMARY KEY,
	`guild_id` text,
	`log_channel` text,
	`nickname` text,
	`createdAt` text NOT NULL,
	`updatedAt` text NOT NULL,
	`sleep_image` text,
	`default_images` text DEFAULT '[]'
);
--> statement-breakpoint
INSERT INTO `__new_botData`(`id`, `guild_id`, `log_channel`, `nickname`, `createdAt`, `updatedAt`, `sleep_image`, `default_images`) SELECT `id`, `guild_id`, `log_channel`, `nickname`, `createdAt`, `updatedAt`, `sleep_image`, `default_images` FROM `botData`;--> statement-breakpoint
DROP TABLE `botData`;--> statement-breakpoint
ALTER TABLE `__new_botData` RENAME TO `botData`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_userSessions` (
	`user_id` text PRIMARY KEY,
	`guilds` text DEFAULT '[]',
	`createdAt` text NOT NULL,
	`updatedAt` text NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_userSessions`(`user_id`, `guilds`, `createdAt`, `updatedAt`) SELECT `user_id`, `guilds`, `createdAt`, `updatedAt` FROM `userSessions`;--> statement-breakpoint
DROP TABLE `userSessions`;--> statement-breakpoint
ALTER TABLE `__new_userSessions` RENAME TO `userSessions`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `action_data_unique_constraint` ON `actionData` (`user_id`,`location_id`,`action_type`);