import "server-only";

import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import path from "node:path";

import * as schema from "./schema";

export const DB_PATH =
  process.env.DATABASE_PATH ?? path.join(process.cwd(), "data", "app.db");

/**
 * Der Dev-Server lädt Module bei jedem Hot-Reload neu. Ohne Cache am
 * globalThis würde jedes Mal ein neues Handle auf dieselbe Datei geöffnet.
 */
const globalForDb = globalThis as unknown as {
  __sqlite?: Database.Database;
};

function openDatabase(): Database.Database {
  const sqlite = new Database(DB_PATH);
  // WAL erlaubt gleichzeitige Leser während geschrieben wird — wichtig, weil
  // Handy und Laptop parallel auf denselben Charakter zugreifen.
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  sqlite.pragma("busy_timeout = 5000");
  return sqlite;
}

export const sqlite = (globalForDb.__sqlite ??= openDatabase());

export const db = drizzle(sqlite, { schema });

export { schema };
