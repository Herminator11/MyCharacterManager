/**
 * Befüllt den Katalog aus den mitgelieferten SRD-Daten (data/srd/).
 *
 * Läuft rein lokal — kein Netzzugriff. Idempotent: mehrfaches Ausführen
 * aktualisiert bestehende Einträge, statt zu duplizieren.
 *
 * Erzeugt außerdem src/lib/rules/progression.generated.ts aus Levels.json.
 */
import { getTableColumns, sql } from "drizzle-orm";
import type { SQLiteTable } from "drizzle-orm/sqlite-core";
import fs from "node:fs";
import path from "node:path";

import { connect } from "./db-connect";
import { spells, srdConditions } from "../src/db/schema";
import { CLASS_KEYS } from "../src/lib/rules/classes";

const SRD_DIR = path.join(process.cwd(), "data", "srd");

/**
 * Baut das `set` für ein Upsert: jede Spalte außer den Konflikt-Spalten
 * übernimmt den Wert aus der eingefügten Zeile (`excluded`).
 */
function overwriteAllExcept<T extends SQLiteTable>(
  table: T,
  keep: readonly string[],
) {
  return Object.fromEntries(
    Object.entries(getTableColumns(table))
      .filter(([property]) => !keep.includes(property))
      .map(([property, column]) => [
        property,
        sql.raw(`excluded."${column.name}"`),
      ]),
  );
}

/** SQLite begrenzt die Parameterzahl pro Statement — in Blöcken einfügen. */
function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

function readSrd<T>(file: string): T {
  const full = path.join(SRD_DIR, file);
  if (!fs.existsSync(full)) {
    throw new Error(
      `SRD-Datei fehlt: ${full}\n` +
        `Erwartet werden Spells.json, Levels.json und Conditions.json.`,
    );
  }
  return JSON.parse(fs.readFileSync(full, "utf8")) as T;
}

/* ------------------------------------------------------------------ *
 * Zauber
 * ------------------------------------------------------------------ */

type SrdSpell = {
  index: string;
  name: string;
  level: number;
  school?: { name?: string };
  casting_time?: string;
  range?: string;
  components?: string[];
  material?: string;
  duration?: string;
  concentration?: boolean;
  ritual?: boolean;
  attack_type?: string;
  dc?: { dc_type?: { index?: string }; dc_success?: string };
  desc?: string[];
  higher_level?: string[];
  damage?: {
    damage_type?: { name?: string };
    damage_at_slot_level?: Record<string, string>;
    damage_at_character_level?: Record<string, string>;
  };
  classes?: { index?: string }[];
};

function seedSpells(db: ReturnType<typeof connect>["db"]) {
  const data = readSrd<SrdSpell[]>("Spells.json");

  const rows = data.map((s) => ({
    indexKey: s.index,
    name: s.name,
    level: s.level,
    school: s.school?.name ?? "",
    castingTime: s.casting_time ?? "",
    range: s.range ?? "",
    components: (s.components ?? []).join(","),
    material: s.material ?? "",
    duration: s.duration ?? "",
    concentration: Boolean(s.concentration),
    ritual: Boolean(s.ritual),
    attackType: s.attack_type ?? "",
    saveAbility: s.dc?.dc_type?.index ?? "",
    saveSuccess: s.dc?.dc_success ?? "",
    description: (s.desc ?? []).join("\n\n"),
    higherLevel: (s.higher_level ?? []).join("\n\n"),
    // Cantrips skalieren über Charakterlevel statt Slot-Grad; wir speichern
    // beides im selben Feld, der Konsument unterscheidet per Zaubergrad.
    damageAtSlotLevel: JSON.stringify(
      s.damage?.damage_at_slot_level ??
        s.damage?.damage_at_character_level ??
        {},
    ),
    damageType: s.damage?.damage_type?.name ?? "",
    classes: JSON.stringify(
      (s.classes ?? []).map((c) => c.index).filter(Boolean),
    ),
    source: "srd" as const,
  }));

  const set = overwriteAllExcept(spells, ["id", "indexKey", "source"]);
  for (const batch of chunk(rows, 100)) {
    db.insert(spells)
      .values(batch)
      .onConflictDoUpdate({ target: [spells.indexKey, spells.source], set })
      .run();
  }

  return rows.length;
}

/* ------------------------------------------------------------------ *
 * Conditions
 * ------------------------------------------------------------------ */

type SrdCondition = { index: string; name: string; desc?: string[] };

/** Deutsche Namen — die Regelbegriffe selbst bleiben am Tisch englisch. */
const CONDITION_LABELS: Record<string, string> = {
  blinded: "Blinded — Blind",
  charmed: "Charmed — Bezaubert",
  deafened: "Deafened — Taub",
  exhaustion: "Exhaustion — Erschöpfung",
  frightened: "Frightened — Verängstigt",
  grappled: "Grappled — Gepackt",
  incapacitated: "Incapacitated — Handlungsunfähig",
  invisible: "Invisible — Unsichtbar",
  paralyzed: "Paralyzed — Gelähmt",
  petrified: "Petrified — Versteinert",
  poisoned: "Poisoned — Vergiftet",
  prone: "Prone — Liegend",
  restrained: "Restrained — Festgesetzt",
  stunned: "Stunned — Betäubt",
  unconscious: "Unconscious — Bewusstlos",
};

function seedConditions(db: ReturnType<typeof connect>["db"]) {
  const data = readSrd<SrdCondition[]>("Conditions.json");

  const rows = data
    .map((c, i) => ({
      key: c.index,
      name: CONDITION_LABELS[c.index] ?? c.name,
      description: (c.desc ?? []).join("\n"),
      sortOrder: i,
    }))
    .sort((a, b) => a.name.localeCompare(b.name, "de"))
    .map((r, i) => ({ ...r, sortOrder: i }));

  db.insert(srdConditions)
    .values(rows)
    .onConflictDoUpdate({
      target: srdConditions.key,
      set: overwriteAllExcept(srdConditions, ["key"]),
    })
    .run();

  return rows.length;
}

/* ------------------------------------------------------------------ *
 * Klassen-Progression → generiertes TS-Modul
 * ------------------------------------------------------------------ */

type SrdLevel = {
  level: number;
  prof_bonus?: number;
  class: { index: string };
  /**
   * Gesetzt bei Subclass-Zeilen (z.B. "fiend-1"). Die tragen dieselbe
   * class.index und denselben Level wie die echte Klassenzeile, aber keine
   * Spellcasting-Daten — sie müssen übersprungen werden, sonst überschreiben
   * sie die Klassen-Progression mit Nullen.
   */
  subclass?: { index: string };
  spellcasting?: Record<string, number>;
  class_specific?: Record<string, unknown>;
};

function generateProgression() {
  const data = readSrd<SrdLevel[]>("Levels.json");

  /** classKey → level → { slots, classSpecific } */
  const byClass: Record<
    string,
    Record<number, { slots: number[]; specific: Record<string, number> }>
  > = {};

  for (const entry of data) {
    if (entry.subclass) continue;
    const key = entry.class.index;
    if (!CLASS_KEYS.includes(key as (typeof CLASS_KEYS)[number])) continue;

    const slots: number[] = [];
    for (let lvl = 1; lvl <= 9; lvl++) {
      slots.push(entry.spellcasting?.[`spell_slots_level_${lvl}`] ?? 0);
    }

    // Nur numerische class_specific-Werte übernehmen; verschachtelte
    // Strukturen wie `creating_spell_slots` bilden wir nicht ab.
    const specific: Record<string, number> = {};
    for (const [k, v] of Object.entries(entry.class_specific ?? {})) {
      if (typeof v === "number") specific[k] = v;
    }

    (byClass[key] ??= {})[entry.level] = { slots, specific };
  }

  const lines: string[] = [
    "/* eslint-disable */",
    "/**",
    " * GENERIERT von scripts/seed.ts aus data/srd/Levels.json.",
    " * Nicht von Hand bearbeiten — Änderungen gehen beim nächsten",
    " * `npm run db:seed` verloren.",
    " *",
    " * Quelle: SRD 5.1, CC-BY-4.0 (siehe NOTICE.md).",
    " */",
    "",
    "export type LevelEntry = {",
    "  /** Zauberplätze für Grad 1–9 auf diesem Klassenlevel. */",
    "  slots: readonly number[];",
    "  /** Klassenspezifische Zähler, z.B. rage_count oder ki_points. */",
    "  specific: Readonly<Record<string, number>>;",
    "};",
    "",
    "export const PROGRESSION: Readonly<",
    "  Record<string, Readonly<Record<number, LevelEntry>>>",
    "> = {",
  ];

  for (const classKey of Object.keys(byClass).sort()) {
    lines.push(`  ${JSON.stringify(classKey)}: {`);
    for (const level of Object.keys(byClass[classKey])
      .map(Number)
      .sort((a, b) => a - b)) {
      const { slots, specific } = byClass[classKey][level];
      lines.push(
        `    ${level}: { slots: [${slots.join(", ")}], specific: ${JSON.stringify(specific)} },`,
      );
    }
    lines.push("  },");
  }

  lines.push("};", "");

  const out = path.join(
    process.cwd(),
    "src",
    "lib",
    "rules",
    "progression.generated.ts",
  );
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, lines.join("\n"), "utf8");

  return { classes: Object.keys(byClass).length, out };
}

/* ------------------------------------------------------------------ *
 * Lauf
 * ------------------------------------------------------------------ */

const { db, sqlite } = connect();

const spellCount = seedSpells(db);
const conditionCount = seedConditions(db);
const progression = generateProgression();

sqlite.close();

console.log(`Zauber-Katalog:  ${spellCount}`);
console.log(`Conditions:      ${conditionCount}`);
console.log(
  `Progression:     ${progression.classes} Klassen → ${path.relative(process.cwd(), progression.out)}`,
);
