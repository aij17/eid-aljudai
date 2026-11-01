CREATE TABLE `registrations` (
	`id` text PRIMARY KEY NOT NULL,
	`contact` text NOT NULL,
	`phone` text NOT NULL,
	`guests` text NOT NULL,
	`total` integer NOT NULL,
	`receipt` text NOT NULL,
	`mime` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`attendance` text DEFAULT '[]' NOT NULL,
	`created` text NOT NULL
);
