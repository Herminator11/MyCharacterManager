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
import { species, spells, srdConditions } from "../src/db/schema";
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
 * Spezies
 * ------------------------------------------------------------------ */

type SrdRef = { index: string; name?: string };

type SrdRace = {
  index: string;
  name: string;
  speed: number;
  size: string;
  ability_bonuses?: { ability_score: SrdRef; bonus: number }[];
  ability_bonus_options?: { choose: number; from?: { options?: unknown[] } };
  traits?: SrdRef[];
};

type SrdSubrace = {
  index: string;
  name: string;
  race: SrdRef;
  ability_bonuses?: { ability_score: SrdRef; bonus: number }[];
  racial_traits?: SrdRef[];
};

type SrdTrait = { index: string; name: string; desc?: string[] };

/** { "cha": 2, "int": 1 } aus der SRD-Liste; addiert bei Subrassen dazu. */
function addBonuses(
  into: Record<string, number>,
  list: { ability_score: SrdRef; bonus: number }[] | undefined,
) {
  for (const entry of list ?? []) {
    const key = entry.ability_score.index;
    into[key] = (into[key] ?? 0) + entry.bonus;
  }
  return into;
}

function seedSpecies(db: ReturnType<typeof connect>["db"]) {
  const races = readSrd<SrdRace[]>("Races.json");
  const subraces = readSrd<SrdSubrace[]>("Subraces.json");
  const traitData = readSrd<SrdTrait[]>("Traits.json");

  const traitByIndex = new Map(traitData.map((t) => [t.index, t]));
  const resolve = (refs: SrdRef[] | undefined) =>
    (refs ?? [])
      .map((ref) => traitByIndex.get(ref.index))
      .filter((t): t is SrdTrait => Boolean(t))
      .map((t) => ({ name: t.name, description: (t.desc ?? []).join("\n\n") }));

  const rows: (typeof species.$inferInsert)[] = [];

  for (const race of races) {
    // Was das Regelwerk offen lässt, wird notiert statt geraten: der
    // Half-Elf verteilt zwei Punkte frei, und welche es sind, weiß nur
    // der Spieler.
    const choose = race.ability_bonus_options?.choose ?? 0;

    rows.push({
      key: race.index,
      name: race.name,
      source: "srd",
      parentKey: "",
      speed: race.speed,
      size: race.size,
      abilityBonuses: JSON.stringify(addBonuses({}, race.ability_bonuses)),
      traits: JSON.stringify(resolve(race.traits)),
      choiceNote: choose
        ? `Dazu ${choose} × +1 auf frei gewählte Attribute.`
        : "",
      sortOrder: 0,
    });
  }

  const raceByIndex = new Map(races.map((r) => [r.index, r]));

  for (const sub of subraces) {
    const parent = raceByIndex.get(sub.race.index);
    if (!parent) continue;

    // Fertig verrechnet abgelegt — siehe Kommentar an der Tabelle.
    rows.push({
      key: sub.index,
      name: sub.name,
      source: "srd",
      parentKey: parent.index,
      speed: parent.speed,
      size: parent.size,
      abilityBonuses: JSON.stringify(
        addBonuses(addBonuses({}, parent.ability_bonuses), sub.ability_bonuses),
      ),
      traits: JSON.stringify([
        ...resolve(parent.traits),
        ...resolve(sub.racial_traits),
      ]),
      choiceNote: parent.ability_bonus_options?.choose
        ? `Dazu ${parent.ability_bonus_options.choose} × +1 auf frei gewählte Attribute.`
        : "",
      sortOrder: 0,
    });
  }

  // Grundspezies und ihre Subrassen bleiben beieinander, alphabetisch.
  rows.sort((a, b) =>
    `${a.parentKey || a.key}${a.parentKey ? `/${a.name}` : ""}`.localeCompare(
      `${b.parentKey || b.key}${b.parentKey ? `/${b.name}` : ""}`,
      "de",
    ),
  );
  rows.forEach((row, i) => (row.sortOrder = i));

  db.insert(species)
    .values(rows)
    .onConflictDoUpdate({
      target: species.key,
      // `source` bleibt außen vor: eine von Hand angelegte Spezies, die
      // zufällig einen SRD-Key trägt, wird nicht zur SRD-Zeile umgedeutet.
      set: overwriteAllExcept(species, ["key", "source"]),
    })
    .run();

  return rows.length;
}

/* ------------------------------------------------------------------ *
 * Klassen-Progression → generiertes TS-Modul
 * ------------------------------------------------------------------ */

/**
 * Anzeigenamen der SRD-Subklassen.
 *
 * Levels.json führt nur den Index ("fiend", "land"). Als Vorschlag im
 * Eingabefeld wäre das irreführend — im Buch heißen sie "The Fiend" und
 * "Circle of the Land". Dieselbe Handreichung wie bei CONDITION_LABELS.
 */
const SUBCLASS_LABELS: Record<string, string> = {
  berserker: "Path of the Berserker",
  champion: "Champion",
  devotion: "Oath of Devotion",
  draconic: "Draconic Bloodline",
  evocation: "School of Evocation",
  fiend: "The Fiend",
  hunter: "Hunter",
  land: "Circle of the Land",
  life: "Life Domain",
  lore: "College of Lore",
  "open-hand": "Way of the Open Hand",
  thief: "Thief",
};

/** Rückfall für Subklassen, die künftig ohne Label dazukommen. */
function titleCase(index: string): string {
  return index
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

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

  /** classKey → Subclass-Indexe, aus denselben Zeilen mitgenommen. */
  const subclassesByClass: Record<string, Set<string>> = {};

  for (const entry of data) {
    if (entry.subclass) {
      const key = entry.class.index;
      if (CLASS_KEYS.includes(key as (typeof CLASS_KEYS)[number])) {
        (subclassesByClass[key] ??= new Set()).add(entry.subclass.index);
      }
      continue;
    }
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

  // Die Subclass-Namen als Vorschlagsliste. Das SRD kennt genau eine je
  // Klasse; das Feld bleibt trotzdem Freitext, weil am Tisch jede andere
  // gespielt werden darf.
  lines.push(
    "/**",
    " * Subklassen-Vorschläge je Klasse — Datalist, keine Auswahl.",
    " * Das SRD führt genau eine pro Klasse; Freitext bleibt erlaubt.",
    " */",
    "export const SUBCLASSES: Readonly<Record<string, readonly string[]>> = {",
  );
  for (const classKey of Object.keys(subclassesByClass).sort()) {
    const names = [...subclassesByClass[classKey]]
      .sort()
      .map((index) => SUBCLASS_LABELS[index] ?? titleCase(index));
    lines.push(`  ${JSON.stringify(classKey)}: ${JSON.stringify(names)},`);
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
const speciesCount = seedSpecies(db);
const progression = generateProgression();

sqlite.close();

console.log(`Zauber-Katalog:  ${spellCount}`);
console.log(`Conditions:      ${conditionCount}`);
console.log(`Spezies:         ${speciesCount}`);
console.log(
  `Progression:     ${progression.classes} Klassen → ${path.relative(process.cwd(), progression.out)}`,
);
