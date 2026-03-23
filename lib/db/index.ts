import { drizzle } from "drizzle-orm/sqlite-proxy";
import * as schema from "./schema";
import path from "path";
import { DatabaseSync } from "node:sqlite";

const DB_PATH = path.join(process.cwd(), "outreach.db");
const sqlite = new DatabaseSync(DB_PATH);

// Wrap Node's built-in SQLite with Drizzle's sqlite-proxy adapter
export const db = drizzle(
  async (sql, params, method) => {
    try {
      if (method === "run") {
        const stmt = sqlite.prepare(sql);
        stmt.run(...params);
        return { rows: [] };
      } else if (method === "all") {
        const stmt = sqlite.prepare(sql);
        const rows = stmt.all(...params) as Record<string, unknown>[];
        return { rows: rows.map(Object.values) };
      } else if (method === "get") {
        const stmt = sqlite.prepare(sql);
        const row = stmt.get(...params) as Record<string, unknown> | undefined;
        return { rows: row ? [Object.values(row)] : [] };
      } else {
        // values — same as all but rows are already value arrays
        const stmt = sqlite.prepare(sql);
        const rows = stmt.all(...params) as Record<string, unknown>[];
        return { rows: rows.map(Object.values) };
      }
    } catch (err) {
      throw err;
    }
  },
  { schema, logger: false }
);

export { schema };
