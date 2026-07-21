ALTER TABLE `characters` ADD `action_used` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `characters` ADD `bonus_action_used` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `characters` ADD `reaction_used` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `characters` ADD `movement_used` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `inventory_items` ADD `attuned` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `inventory_items` ADD `requires_attunement` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `notes` ADD `kind` text DEFAULT 'page' NOT NULL;