/**
 * DB-Verbindung für Node-Skripte (Migration, Seed, Tests).
 *
 * Bewusst getrennt von `src/db/index.ts`: das dortige Modul ist mit
 * `server-only` markiert und damit außerhalb von Next.js nicht importierbar.
 */
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import fs from "node:fs";
import path from "node:path";

import * as schema from "../src/db/schema";

export function connect(dbPath = process.env.DATABASE_PATH) {
  const file = dbPath ?? path.join(process.cwd(), "data", "app.db");
  if (file !== ":memory:") {
    fs.mkdirSync(path.dirname(file), { recursive: true });
  }
  const sqlite = new Database(file);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  return { sqlite, db: drizzle(sqlite, { schema }), file };
}
