CREATE TABLE `comments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`post_id` integer NOT NULL,
	`draft` text NOT NULL,
	`edited_draft` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`prompt_version` text,
	`posted_at` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`post_id`) REFERENCES `posts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `leads` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`place_id` text NOT NULL,
	`business_name` text NOT NULL,
	`niche` text NOT NULL,
	`city` text NOT NULL,
	`phone` text,
	`website` text,
	`address` text,
	`rating` real,
	`review_count` integer,
	`status` text DEFAULT 'discovered' NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `leads_place_id_unique` ON `leads` (`place_id`);--> statement-breakpoint
CREATE TABLE `posts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`social_profile_id` integer NOT NULL,
	`post_url` text NOT NULL,
	`post_text` text,
	`posted_at` text,
	`discovered_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`social_profile_id`) REFERENCES `social_profiles`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `posts_post_url_unique` ON `posts` (`post_url`);--> statement-breakpoint
CREATE TABLE `social_profiles` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`lead_id` integer NOT NULL,
	`platform` text NOT NULL,
	`profile_url` text NOT NULL,
	`profile_name` text,
	`match_method` text,
	`last_checked_at` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`lead_id`) REFERENCES `leads`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `social_profiles_profile_url_unique` ON `social_profiles` (`profile_url`);