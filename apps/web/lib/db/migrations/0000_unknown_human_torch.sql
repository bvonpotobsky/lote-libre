CREATE TABLE `account` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`provider_id` text NOT NULL,
	`user_id` text NOT NULL,
	`access_token` text,
	`refresh_token` text,
	`id_token` text,
	`access_token_expires_at` integer,
	`refresh_token_expires_at` integer,
	`scope` text,
	`password` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `account_user_id_idx` ON `account` (`user_id`);--> statement-breakpoint
CREATE TABLE `lote_verifications` (
	`id` text PRIMARY KEY NOT NULL,
	`lote_id` text NOT NULL,
	`user_id` text NOT NULL,
	`status` text NOT NULL,
	`verdict` text,
	`forest_loss_pct` real,
	`forest_loss_ha` real,
	`forest_loss_first_year` integer,
	`otbn_category` text,
	`otbn_pct` real,
	`sources` text DEFAULT '[]' NOT NULL,
	`failure_code` text,
	`document_hash` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`lote_id`) REFERENCES `lotes`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `lote_verifications_lote_idx` ON `lote_verifications` (`lote_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `lote_verifications_user_idx` ON `lote_verifications` (`user_id`);--> statement-breakpoint
CREATE TABLE `lotes` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`nombre` text NOT NULL,
	`provincia` text NOT NULL,
	`renspa` text,
	`geometry` text NOT NULL,
	`geometry_hash` text NOT NULL,
	`area_ha` real NOT NULL,
	`centroid_lon` real NOT NULL,
	`centroid_lat` real NOT NULL,
	`bbox_min_lon` real NOT NULL,
	`bbox_min_lat` real NOT NULL,
	`bbox_max_lon` real NOT NULL,
	`bbox_max_lat` real NOT NULL,
	`source` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `lotes_user_id_idx` ON `lotes` (`user_id`);--> statement-breakpoint
CREATE INDEX `lotes_geometry_hash_idx` ON `lotes` (`geometry_hash`);--> statement-breakpoint
CREATE TABLE `satellite_images` (
	`id` text PRIMARY KEY NOT NULL,
	`geometry_hash` text NOT NULL,
	`period` text NOT NULL,
	`layer` text NOT NULL,
	`date_from` text NOT NULL,
	`date_to` text NOT NULL,
	`window_source` text NOT NULL,
	`cloud_avg_pct` real,
	`file_path` text NOT NULL,
	`bytes` integer NOT NULL,
	`is_empty` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `satellite_images_key_idx` ON `satellite_images` (`geometry_hash`,`period`,`layer`,`date_from`,`date_to`);--> statement-breakpoint
CREATE TABLE `session` (
	`id` text PRIMARY KEY NOT NULL,
	`expires_at` integer NOT NULL,
	`token` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`ip_address` text,
	`user_agent` text,
	`user_id` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `session_token_unique` ON `session` (`token`);--> statement-breakpoint
CREATE INDEX `session_user_id_idx` ON `session` (`user_id`);--> statement-breakpoint
CREATE TABLE `user` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`email_verified` integer DEFAULT false NOT NULL,
	`image` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_email_unique` ON `user` (`email`);--> statement-breakpoint
CREATE TABLE `verification` (
	`id` text PRIMARY KEY NOT NULL,
	`identifier` text NOT NULL,
	`value` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `verification_identifier_idx` ON `verification` (`identifier`);