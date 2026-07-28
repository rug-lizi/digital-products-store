CREATE TABLE `secure_settings` (
	`key` text PRIMARY KEY NOT NULL,
	`encrypted_value` text NOT NULL,
	`updated_at` integer NOT NULL
);
