CREATE TABLE `registration_access` (
	`registration_id` text PRIMARY KEY NOT NULL,
	`token_hash` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `registration_access_token_hash_unique` ON `registration_access` (`token_hash`);--> statement-breakpoint
CREATE TABLE `registration_changes` (
	`registration_id` text PRIMARY KEY NOT NULL,
	`guests` text NOT NULL,
	`total` integer NOT NULL,
	`created` text NOT NULL
);
