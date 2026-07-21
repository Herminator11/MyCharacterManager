CREATE TABLE `active_conditions` (
	`character_id` integer NOT NULL,
	`condition_key` text NOT NULL,
	PRIMARY KEY(`character_id`, `condition_key`),
	FOREIGN KEY (`character_id`) REFERENCES `characters`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`condition_key`) REFERENCES `srd_conditions`(`key`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `attacks` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`character_id` integer NOT NULL,
	`name` text NOT NULL,
	`ability` text DEFAULT 'str' NOT NULL,
	`proficient` integer DEFAULT true NOT NULL,
	`attack_bonus_override` integer,
	`damage_dice` text DEFAULT '' NOT NULL,
	`damage_type` text DEFAULT '' NOT NULL,
	`damage_bonus_override` integer,
	`range` text DEFAULT '' NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`character_id`) REFERENCES `characters`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_attack_character` ON `attacks` (`character_id`);--> statement-breakpoint
CREATE TABLE `character_classes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`character_id` integer NOT NULL,
	`class_key` text NOT NULL,
	`subclass` text DEFAULT '' NOT NULL,
	`level` integer DEFAULT 1 NOT NULL,
	`hit_die` integer DEFAULT 8 NOT NULL,
	`hit_dice_used` integer DEFAULT 0 NOT NULL,
	`is_primary` integer DEFAULT false NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`character_id`) REFERENCES `characters`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_classes_character` ON `character_classes` (`character_id`);--> statement-breakpoint
CREATE TABLE `character_spells` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`character_id` integer NOT NULL,
	`spell_id` integer NOT NULL,
	`prepared` integer DEFAULT false NOT NULL,
	`always_prepared` integer DEFAULT false NOT NULL,
	`favorite` integer DEFAULT false NOT NULL,
	`default_pool_id` integer,
	`notes` text DEFAULT '' NOT NULL,
	FOREIGN KEY (`character_id`) REFERENCES `characters`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`spell_id`) REFERENCES `spells`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`default_pool_id`) REFERENCES `spell_pools`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `idx_cspell_character` ON `character_spells` (`character_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `uq_character_spell` ON `character_spells` (`character_id`,`spell_id`);--> statement-breakpoint
CREATE TABLE `characters` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`race` text DEFAULT '' NOT NULL,
	`background` text DEFAULT '' NOT NULL,
	`alignment` text DEFAULT '' NOT NULL,
	`xp` integer DEFAULT 0 NOT NULL,
	`str` integer DEFAULT 10 NOT NULL,
	`dex` integer DEFAULT 10 NOT NULL,
	`con` integer DEFAULT 10 NOT NULL,
	`int` integer DEFAULT 10 NOT NULL,
	`wis` integer DEFAULT 10 NOT NULL,
	`cha` integer DEFAULT 10 NOT NULL,
	`hp_current` integer DEFAULT 0 NOT NULL,
	`hp_temp` integer DEFAULT 0 NOT NULL,
	`death_save_successes` integer DEFAULT 0 NOT NULL,
	`death_save_failures` integer DEFAULT 0 NOT NULL,
	`inspiration` integer DEFAULT false NOT NULL,
	`hp_max_override` integer,
	`hp_max_seen` integer DEFAULT 0 NOT NULL,
	`ac_override` integer,
	`initiative_override` integer,
	`passive_perception_override` integer,
	`passive_insight_override` integer,
	`speed` integer DEFAULT 30 NOT NULL,
	`personality` text DEFAULT '' NOT NULL,
	`ideals` text DEFAULT '' NOT NULL,
	`bonds` text DEFAULT '' NOT NULL,
	`flaws` text DEFAULT '' NOT NULL,
	`backstory` text DEFAULT '' NOT NULL,
	`cp` integer DEFAULT 0 NOT NULL,
	`sp` integer DEFAULT 0 NOT NULL,
	`ep` integer DEFAULT 0 NOT NULL,
	`gp` integer DEFAULT 0 NOT NULL,
	`pp` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `concentration` (
	`character_id` integer PRIMARY KEY NOT NULL,
	`spell_id` integer,
	`label` text DEFAULT '' NOT NULL,
	`cast_at_level` integer DEFAULT 0 NOT NULL,
	`started_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`character_id`) REFERENCES `characters`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`spell_id`) REFERENCES `spells`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `inventory_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`character_id` integer NOT NULL,
	`name` text NOT NULL,
	`qty` integer DEFAULT 1 NOT NULL,
	`weight` real DEFAULT 0 NOT NULL,
	`value_cp` integer DEFAULT 0 NOT NULL,
	`equipped` integer DEFAULT false NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`character_id`) REFERENCES `characters`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_item_character` ON `inventory_items` (`character_id`);--> statement-breakpoint
CREATE TABLE `notes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`character_id` integer NOT NULL,
	`title` text DEFAULT 'Neue Notiz' NOT NULL,
	`body` text DEFAULT '' NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`character_id`) REFERENCES `characters`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_note_character` ON `notes` (`character_id`);--> statement-breakpoint
CREATE TABLE `proficiencies` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`character_id` integer NOT NULL,
	`kind` text NOT NULL,
	`key` text NOT NULL,
	`level` integer DEFAULT 0 NOT NULL,
	`misc_bonus` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`character_id`) REFERENCES `characters`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_prof_character` ON `proficiencies` (`character_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `uq_prof` ON `proficiencies` (`character_id`,`kind`,`key`);--> statement-breakpoint
CREATE TABLE `resources` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`character_id` integer NOT NULL,
	`name` text NOT NULL,
	`auto_key` text DEFAULT '' NOT NULL,
	`current` integer DEFAULT 0 NOT NULL,
	`max` integer DEFAULT 0 NOT NULL,
	`recovery` text DEFAULT 'long' NOT NULL,
	`display` text DEFAULT 'pips' NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`source` text DEFAULT 'auto' NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`character_id`) REFERENCES `characters`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_resource_character` ON `resources` (`character_id`);--> statement-breakpoint
CREATE TABLE `spell_pool_slots` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`pool_id` integer NOT NULL,
	`level` integer NOT NULL,
	`total` integer DEFAULT 0 NOT NULL,
	`used` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`pool_id`) REFERENCES `spell_pools`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_pool_slot` ON `spell_pool_slots` (`pool_id`,`level`);--> statement-breakpoint
CREATE TABLE `spell_pools` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`character_id` integer NOT NULL,
	`name` text NOT NULL,
	`auto_key` text DEFAULT '' NOT NULL,
	`recovery` text DEFAULT 'long' NOT NULL,
	`spellcasting_ability` text DEFAULT 'int' NOT NULL,
	`source` text DEFAULT 'auto' NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`character_id`) REFERENCES `characters`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_pool_character` ON `spell_pools` (`character_id`);--> statement-breakpoint
CREATE TABLE `spells` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`index_key` text DEFAULT '' NOT NULL,
	`name` text NOT NULL,
	`level` integer NOT NULL,
	`school` text DEFAULT '' NOT NULL,
	`casting_time` text DEFAULT '' NOT NULL,
	`range` text DEFAULT '' NOT NULL,
	`components` text DEFAULT '' NOT NULL,
	`material` text DEFAULT '' NOT NULL,
	`duration` text DEFAULT '' NOT NULL,
	`concentration` integer DEFAULT false NOT NULL,
	`ritual` integer DEFAULT false NOT NULL,
	`attack_type` text DEFAULT '' NOT NULL,
	`save_ability` text DEFAULT '' NOT NULL,
	`save_success` text DEFAULT '' NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`higher_level` text DEFAULT '' NOT NULL,
	`damage_at_slot_level` text DEFAULT '' NOT NULL,
	`damage_type` text DEFAULT '' NOT NULL,
	`classes` text DEFAULT '[]' NOT NULL,
	`source` text DEFAULT 'srd' NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_spell_level` ON `spells` (`level`);--> statement-breakpoint
CREATE INDEX `idx_spell_name` ON `spells` (`name`);--> statement-breakpoint
CREATE UNIQUE INDEX `uq_spell_index` ON `spells` (`index_key`,`source`);--> statement-breakpoint
CREATE TABLE `srd_conditions` (
	`key` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL
);
