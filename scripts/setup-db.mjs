/**
 * scripts/setup-db.mjs
 * Initialize the SQLite database using Node's built-in sqlite module.
 * Usage: node --experimental-sqlite scripts/setup-db.mjs
 *        (Node 24+ has sqlite built in, no flag needed in some versions)
 */

import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const DB_PATH = join(ROOT, "outreach.db");

// Use Node's built-in sqlite (Node 22.5+)
const { DatabaseSync } = await import("node:sqlite");
const db = new DatabaseSync(DB_PATH);

const sql = readFileSync(join(ROOT, "lib/db/migrations/0000_bent_spectrum.sql"), "utf8");

// Split on the drizzle statement-breakpoint marker and run each statement
const statements = sql
  .split("--> statement-breakpoint")
  .map((s) => s.trim())
  .filter(Boolean);

for (const stmt of statements) {
  try {
    db.exec(stmt);
    console.log("✓", stmt.slice(0, 80).replace(/\n/g, " "));
  } catch (err) {
    if (err.message?.includes("already exists")) {
      console.log("· already exists, skipping");
    } else {
      console.error("✗ Error:", err.message);
    }
  }
}

db.close();
console.log(`\nDatabase ready: ${DB_PATH}`);
