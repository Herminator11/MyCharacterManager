CREATE TABLE `species` (
	`key` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`source` text DEFAULT 'srd' NOT NULL,
	`parent_key` text DEFAULT '' NOT NULL,
	`speed` integer DEFAULT 30 NOT NULL,
	`size` text DEFAULT 'Medium' NOT NULL,
	`ability_bonuses` text DEFAULT '{}' NOT NULL,
	`traits` text DEFAULT '[]' NOT NULL,
	`choice_note` text DEFAULT '' NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_species_parent` ON `species` (`parent_key`);--> statement-breakpoint
ALTER TABLE `characters` ADD `species_key` text DEFAULT '' NOT NULL;