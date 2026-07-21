import type { Ability } from "@/db/schema";

/**
 * Wie stark eine Klasse zum gemeinsamen Zauberplatz-Pool beiträgt.
 *
 * `pact` ist bewusst keine Zahl: Warlocks Pact Magic geht laut Regelwerk
 * gar nicht in den Multiclass-Topf ein, sondern bleibt ein eigener Pool.
 *
 * `halfUp` gibt es nur für den Artificer: er zählt als einziger Halbcaster
 * mit *aufgerundeten* Leveln und bekommt deshalb schon auf Stufe 1 Zauber,
 * während Paladin und Ranger bis Stufe 2 warten.
 */
export type CasterKind =
  | "full"
  | "half"
  | "halfUp"
  | "third"
  | "pact"
  | "none";

export type ClassDef = {
  key: string;
  /** Anzeigename — Klassennamen bleiben am Tisch englisch. */
  name: string;
  hitDie: 6 | 8 | 10 | 12;
  caster: CasterKind;
  /** Attribut für Zauber-Angriffsbonus und Save-DC. */
  spellcastingAbility?: Ability;
  /** Rettungswürfe, in denen die Klasse als Ursprungsklasse proficient ist. */
  saves: readonly Ability[];
};

export const CLASSES: readonly ClassDef[] = [
  // Artificer steht nicht im SRD, seine Fortschrittstabelle leitet sich
  // aber vollständig aus der Multiclass-Regel ab — reine Mechanik.
  { key: "artificer", name: "Artificer", hitDie: 8, caster: "halfUp", spellcastingAbility: "int", saves: ["con", "int"] },
  { key: "barbarian", name: "Barbarian", hitDie: 12, caster: "none", saves: ["str", "con"] },
  { key: "bard", name: "Bard", hitDie: 8, caster: "full", spellcastingAbility: "cha", saves: ["dex", "cha"] },
  { key: "cleric", name: "Cleric", hitDie: 8, caster: "full", spellcastingAbility: "wis", saves: ["wis", "cha"] },
  { key: "druid", name: "Druid", hitDie: 8, caster: "full", spellcastingAbility: "wis", saves: ["int", "wis"] },
  { key: "fighter", name: "Fighter", hitDie: 10, caster: "none", saves: ["str", "con"] },
  { key: "monk", name: "Monk", hitDie: 8, caster: "none", saves: ["str", "dex"] },
  { key: "paladin", name: "Paladin", hitDie: 10, caster: "half", spellcastingAbility: "cha", saves: ["wis", "cha"] },
  { key: "ranger", name: "Ranger", hitDie: 10, caster: "half", spellcastingAbility: "wis", saves: ["str", "dex"] },
  { key: "rogue", name: "Rogue", hitDie: 8, caster: "none", saves: ["dex", "int"] },
  { key: "sorcerer", name: "Sorcerer", hitDie: 6, caster: "full", spellcastingAbility: "cha", saves: ["con", "cha"] },
  { key: "warlock", name: "Warlock", hitDie: 8, caster: "pact", spellcastingAbility: "cha", saves: ["wis", "cha"] },
  { key: "wizard", name: "Wizard", hitDie: 6, caster: "full", spellcastingAbility: "int", saves: ["int", "wis"] },
] as const;

export const CLASS_KEYS = CLASSES.map((c) => c.key);

const BY_KEY = new Map(CLASSES.map((c) => [c.key, c]));

/** Liefert die Klassendefinition, oder undefined bei Homebrew-Klassen. */
export function getClass(key: string): ClassDef | undefined {
  return BY_KEY.get(key);
}

/** Anzeigename mit Fallback auf den rohen Key (Homebrew). */
export function className(key: string): string {
  return BY_KEY.get(key)?.name ?? key;
}
