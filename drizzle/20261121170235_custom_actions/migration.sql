CREATE TABLE `custom_action_bans` (
	`user_id` text PRIMARY KEY,
	`createdAt` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `custom_actions` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`name` text NOT NULL,
	`phrase` text NOT NULL,
	`scope` text NOT NULL,
	`owner_id` text NOT NULL,
	`image` text,
	`created_by` text,
	`createdAt` text NOT NULL,
	`updatedAt` text NOT NULL
);
--> statement-breakpoint
ALTER TABLE `action_events` ADD `phrase` text;--> statement-breakpoint
CREATE UNIQUE INDEX `custom_actions_scope_owner_name_unique` ON `custom_actions` (`scope`,`owner_id`,`name`);--> statement-breakpoint
CREATE INDEX `custom_actions_name_idx` ON `custom_actions` (`name`);