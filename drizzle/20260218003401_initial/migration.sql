-- Current sql file was generated after introspecting the database
-- If you want to run this migration please uncomment this code before executing migrations
/*
CREATE TABLE `SequelizeMeta` (
	`name` text(255) NOT NULL,
	CONSTRAINT `SequelizeMeta_pk` PRIMARY KEY(`name`)
);
--> statement-breakpoint
CREATE TABLE `actionData` (
	`id` integer AUTOINCREMENT,
	`user_id` text(255) NOT NULL,
	`location_id` text(255),
	`action_type` text(255) NOT NULL,
	`has_performed` integer DEFAULT 0,
	`has_received` integer DEFAULT 0,
	`images` JSON,
	`createdAt` numeric,
	`updatedAt` numeric,
	CONSTRAINT `actionData_pk` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `botData` (
	`id` integer,
	`guild_id` text(255),
	`log_channel` text(255),
	`nickname` text(255),
	`createdAt` numeric NOT NULL,
	`updatedAt` numeric NOT NULL,
	`sleep_image` text,
	`default_images` JSON DEFAULT NULL,
	CONSTRAINT `botData_pk` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `userSessions` (
	`user_id` text(255) NOT NULL,
	`guilds` JSON,
	`createdAt` numeric NOT NULL,
	`updatedAt` numeric NOT NULL,
	CONSTRAINT `userSessions_pk` PRIMARY KEY(`user_id`)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `action_data_unique_constraint` ON `actionData` (`user_id`,`location_id`,`action_type`);
*/