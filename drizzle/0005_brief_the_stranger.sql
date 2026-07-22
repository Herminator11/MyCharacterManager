CREATE TABLE `folders` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
ALTER TABLE `characters` ADD `favorite` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `characters` ADD `folder_id` integer REFERENCES folders(id);