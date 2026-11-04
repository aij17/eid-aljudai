CREATE TABLE `file_chunks` (
	`file_key` text NOT NULL,
	`part` integer NOT NULL,
	`data` blob NOT NULL,
	PRIMARY KEY(`file_key`, `part`)
);
--> statement-breakpoint
CREATE TABLE `file_objects` (
	`key` text PRIMARY KEY NOT NULL,
	`mime` text NOT NULL,
	`size` integer NOT NULL,
	`chunks` integer NOT NULL
);
