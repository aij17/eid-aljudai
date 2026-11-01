ALTER TABLE `registrations` ADD `admin_notice` text DEFAULT 'disabled' NOT NULL;--> statement-breakpoint
ALTER TABLE `registrations` ADD `contact_consent` integer DEFAULT 0 NOT NULL;