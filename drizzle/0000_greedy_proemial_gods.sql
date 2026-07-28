CREATE TABLE `admin_sessions` (
	`token_hash` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL,
	`expires_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `download_grants` (
	`id` text PRIMARY KEY NOT NULL,
	`order_id` text NOT NULL,
	`token_hash` text NOT NULL,
	`created_at` integer NOT NULL,
	`expires_at` integer NOT NULL,
	`download_count` integer DEFAULT 0 NOT NULL,
	`max_downloads` integer NOT NULL,
	`last_downloaded_at` integer,
	`revoked_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `download_grants_order_id_unique` ON `download_grants` (`order_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `download_grants_token_hash_unique` ON `download_grants` (`token_hash`);--> statement-breakpoint
CREATE TABLE `events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`type` text NOT NULL,
	`ip` text NOT NULL,
	`price_id` text,
	`amount` integer,
	`order_id` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `login_attempts` (
	`ip_hash` text PRIMARY KEY NOT NULL,
	`failures` integer NOT NULL,
	`reset_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `orders` (
	`id` text PRIMARY KEY NOT NULL,
	`stripe_session_id` text,
	`stripe_payment_intent_id` text,
	`price_id` text NOT NULL,
	`status` text NOT NULL,
	`amount_total` integer,
	`currency` text,
	`customer_email` text,
	`created_at` integer NOT NULL,
	`paid_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `orders_stripe_session_id_unique` ON `orders` (`stripe_session_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `orders_stripe_payment_intent_id_unique` ON `orders` (`stripe_payment_intent_id`);--> statement-breakpoint
CREATE TABLE `webhook_events` (
	`event_id` text PRIMARY KEY NOT NULL,
	`event_type` text NOT NULL,
	`received_at` integer NOT NULL
);
