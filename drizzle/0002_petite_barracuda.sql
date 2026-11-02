ALTER TABLE `registrations` ADD `admin_whatsapp_notice` text DEFAULT 'disabled' NOT NULL;--> statement-breakpoint
ALTER TABLE `registrations` ADD `confirmation_notice` text DEFAULT 'disabled' NOT NULL;--> statement-breakpoint
ALTER TABLE `registrations` ADD `confirmation_provider_id` text;