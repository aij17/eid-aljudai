CREATE TABLE `app_settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
--> statement-breakpoint
ALTER TABLE `registrations` ADD `lifecycle` text DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE `registrations` ADD `refund_status` text DEFAULT 'not_due' NOT NULL;--> statement-breakpoint
ALTER TABLE `registrations` ADD `refund_amount` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `registrations` ADD `refund_note` text;--> statement-breakpoint
ALTER TABLE `registrations` ADD `refunded_at` text;--> statement-breakpoint
ALTER TABLE `registrations` ADD `archived_at` text;