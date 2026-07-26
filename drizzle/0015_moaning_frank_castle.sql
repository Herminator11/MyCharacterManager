ALTER TABLE `characters` ADD `current_session` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `notes` ADD `session` integer;