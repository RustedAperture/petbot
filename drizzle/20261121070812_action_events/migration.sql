CREATE TABLE `action_events` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`action_type` text NOT NULL,
	`performer_hash` text NOT NULL,
	`target_hash` text NOT NULL,
	`location_id` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `action_events_created_at_idx` ON `action_events` (`created_at`);--> statement-breakpoint
CREATE INDEX `action_events_location_created_idx` ON `action_events` (`location_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `action_events_performer_idx` ON `action_events` (`performer_hash`);--> statement-breakpoint
CREATE INDEX `action_events_target_idx` ON `action_events` (`target_hash`);