import "server-only";

import { and, asc, eq } from "drizzle-orm";

import { db } from "@/db";
import { species, type Ability } from "@/db/schema";
import { normalizeSpeciesName, type SpeciesDef } from "@/lib/rules/species";

/**
 * Zugriff auf den Spezies-Katalog.
 *
 * Die Tabelle hält Boni und Traits als JSON-Text — SQLite kennt keine
 * Struktur dafür, und für dreizehn Zeilen lohnt keine eigene Kindtabelle.
 * Das Auspacken passiert genau hier, damit der Rest der App nur noch mit
 * `SpeciesDef` zu tun hat.
 */

/** Zeile → `SpeciesDef`. Kaputtes JSON macht die Spezies leer, nicht die Seite kaputt. */
function toDef(row: typeof species.$inferSelect): SpeciesDef {
  return {
    key: row.key,
    name: row.name,
    parentKey: row.parentKey,
    speed: row.speed,
    size: row.size,
    abilityBonuses: parse<Partial<Record<Ability, number>>>(
      row.abilityBonuses,
      {},
    ),
    traits: parse<SpeciesDef["traits"]>(row.traits, []),
    choiceNote: row.choiceNote,
  };
}

function parse<T>(raw: string, fallback: T): T {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function listSpecies(): SpeciesDef[] {
  return db
    .select()
    .from(species)
    .orderBy(asc(species.sortOrder), asc(species.name))
    .all()
    .map(toDef);
}

export function getSpecies(key: string): SpeciesDef | null {
  if (!key) return null;
  const row = db.select().from(species).where(eq(species.key, key)).get();
  return row ? toDef(row) : null;
}

/**
 * Sucht die Spezies zu einem rohen Bogen-Text („Half-Elf", „hill dwarf").
 *
 * Nur für den Import. Trifft nichts, bleibt es beim Text — eine falsch
 * geratene Spezies wäre schlimmer als gar keine, weil sie Boni behauptet,
 * die der Charakter nie hatte.
 */
export function findSpeciesByName(raw: string): SpeciesDef | null {
  const needle = normalizeSpeciesName(raw);
  if (!needle) return null;

  return (
    listSpecies().find((def) => normalizeSpeciesName(def.name) === needle) ??
    null
  );
}

/**
 * Legt eine eigene Spezies an — alles, was das SRD nicht kennt.
 *
 * Der Key bekommt das Präfix `custom:`, damit ein selbst angelegter
 * „Dwarf" die SRD-Zeile nicht überschreibt und der nächste `db:seed` beide
 * in Ruhe lässt.
 */
export function createCustomSpecies(input: {
  name: string;
  speed: number;
  size: string;
  abilityBonuses: Partial<Record<Ability, number>>;
  traits: { name: string; description: string }[];
  choiceNote?: string;
}): string {
  const name = input.name.trim() || "Namenlose Spezies";
  const base = `custom:${normalizeSpeciesName(name) || "spezies"}`;

  // Zweimal derselbe Name ist kein Fehler, sondern zwei Hausregeln.
  let key = base;
  for (let n = 2; getSpecies(key); n++) key = `${base}-${n}`;

  db.insert(species)
    .values({
      key,
      name,
      source: "custom",
      parentKey: "",
      speed: Math.max(0, Math.round(input.speed)),
      size: input.size.trim() || "Medium",
      abilityBonuses: JSON.stringify(input.abilityBonuses),
      traits: JSON.stringify(input.traits),
      choiceNote: input.choiceNote?.trim() ?? "",
      // Ans Ende der Liste, hinter die SRD-Zeilen.
      sortOrder: 1000,
    })
    .run();

  return key;
}

/**
 * Löscht eine selbst angelegte Spezies. SRD-Zeilen bleiben unangetastet —
 * der nächste Seed brächte sie ohnehin zurück.
 *
 * Charaktere, die daran hingen, behalten ihren `species_key` als tote
 * Verknüpfung. Das ist Absicht: `getSpecies()` gibt dann null zurück, die
 * Anzeige fällt auf den Freitext in `race` zurück, und niemand verliert
 * beim Aufräumen still seine Herkunftsangabe.
 */
export function deleteCustomSpecies(key: string) {
  db.delete(species)
    .where(and(eq(species.key, key), eq(species.source, "custom")))
    .run();
}
