CREATE TABLE `history` (
	`revision` integer PRIMARY KEY NOT NULL,
	`body` text NOT NULL,
	`created_at` text NOT NULL,
	`created_by` text NOT NULL
);

CREATE TABLE `media` (
	`key` text PRIMARY KEY NOT NULL,
	`mime` text NOT NULL,
	`bytes` integer NOT NULL,
	`sha256` text NOT NULL
);

CREATE TABLE `portfolio` (
	`id` integer PRIMARY KEY NOT NULL,
	`revision` integer NOT NULL,
	`body` text NOT NULL,
	`updated_at` text NOT NULL,
	`updated_by` text NOT NULL
);

CREATE TABLE objects (key TEXT PRIMARY KEY NOT NULL, size INTEGER NOT NULL, mime TEXT NOT NULL, chunks TEXT NOT NULL, sha256 TEXT NOT NULL);

CREATE TABLE IF NOT EXISTS preview_snapshot (id INTEGER PRIMARY KEY CHECK(id=1),revision INTEGER NOT NULL,body TEXT NOT NULL);
