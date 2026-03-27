/**
 * One-time migration: adds callStatus, calledAt, callNotes to leads table.
 * Safe to run multiple times (uses IF NOT EXISTS style checks).
 */

import Database from "better-sqlite3";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = join(__dirname, "..", "outreach.db");

const db = new Database(DB_PATH);

const cols = db.prepare("PRAGMA table_info(leads)").all().map((r) => r.name);

const migrations = [
  ["call_status", "ALTER TABLE leads ADD COLUMN call_status TEXT DEFAULT 'not_called'"],
  ["called_at",   "ALTER TABLE leads ADD COLUMN called_at TEXT"],
  ["call_notes",  "ALTER TABLE leads ADD COLUMN call_notes TEXT"],
];

for (const [col, sql] of migrations) {
  if (!cols.includes(col)) {
    db.prepare(sql).run();
    console.log(`  + added column: ${col}`);
  } else {
    console.log(`  ✓ ${col} already exists`);
  }
}

db.close();
console.log("Migration complete.");
