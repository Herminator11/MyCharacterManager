CREATE TABLE `combat_log` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`character_id` integer NOT NULL,
	`round` integer DEFAULT 1 NOT NULL,
	`kind` text NOT NULL,
	`text` text NOT NULL,
	`detail` text DEFAULT '' NOT NULL,
	`amount` integer DEFAULT 0 NOT NULL,
	`at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`character_id`) REFERENCES `characters`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_combatlog_character` ON `combat_log` (`character_id`);--> statement-breakpoint
ALTER TABLE `characters` ADD `encounter_round` integer DEFAULT 0 NOT NULL;