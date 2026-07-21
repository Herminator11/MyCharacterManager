/**
 * Legt für jede Testdatei eine frische, migrierte SQLite-Datei an und
 * verdrahtet sie über DATABASE_PATH, bevor `@/db` geladen wird.
 */
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "charmgr-test-"));
const file = path.join(dir, "test.db");

const sqlite = new Database(file);
sqlite.pragma("foreign_keys = ON");
migrate(drizzle(sqlite), {
  migrationsFolder: path.join(process.cwd(), "drizzle"),
});

// Conditions sind ein Katalog mit Fremdschlüssel — ohne sie schlägt jedes
// Setzen einer Condition fehl. Aus derselben Quelle wie im echten Seed.
const conditions = JSON.parse(
  fs.readFileSync(
    path.join(process.cwd(), "data", "srd", "Conditions.json"),
    "utf8",
  ),
) as { index: string; name: string }[];

const insert = sqlite.prepare(
  "insert into srd_conditions (key, name, description, sort_order) values (?, ?, '', ?)",
);
conditions.forEach((condition, i) => insert.run(condition.index, condition.name, i));

// Der Zauber-Katalog, damit der Import Namen tatsächlich auflösen kann.
// Nur die Spalten, die Tests brauchen — der volle Seed gehört ins Skript.
const spells = JSON.parse(
  fs.readFileSync(
    path.join(process.cwd(), "data", "srd", "Spells.json"),
    "utf8",
  ),
) as { index: string; name: string; level: number; school?: { name?: string } }[];

const insertSpell = sqlite.prepare(
  "insert into spells (index_key, name, level, school, source) values (?, ?, ?, ?, 'srd')",
);
sqlite.transaction(() => {
  for (const spell of spells) {
    insertSpell.run(spell.index, spell.name, spell.level, spell.school?.name ?? "");
  }
})();

sqlite.close();

process.env.DATABASE_PATH = file;
// Portraits landen ebenfalls im Temp-Verzeichnis — sonst würde ein
// Testlauf den echten data/portraits-Ordner leerräumen.
process.env.DATA_DIR = dir;

// Nach dem Lauf aufräumen — Tests sollen keine Dateien hinterlassen.
process.on("exit", () => {
  fs.rmSync(dir, { recursive: true, force: true });
});
