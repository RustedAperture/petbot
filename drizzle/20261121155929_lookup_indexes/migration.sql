CREATE INDEX `action_data_location_action_idx` ON `actionData` (`location_id`,`action_type`);--> statement-breakpoint
CREATE INDEX `action_data_action_type_idx` ON `actionData` (`action_type`);--> statement-breakpoint
CREATE INDEX `bot_data_guild_id_idx` ON `botData` (`guild_id`);