import type { Ability } from "@/db/schema";

/**
 * Die 18 Fertigkeiten mit ihrem Attribut.
 * Anzeige zweisprachig: englischer Regelbegriff zuerst, weil am Tisch so
 * geredet wird, deutsche Entsprechung als Hilfe dahinter.
 */
export type SkillDef = {
  key: string;
  name: string;
  de: string;
  ability: Ability;
};

export const SKILLS: readonly SkillDef[] = [
  { key: "acrobatics", name: "Acrobatics", de: "Akrobatik", ability: "dex" },
  { key: "animal-handling", name: "Animal Handling", de: "Umgang mit Tieren", ability: "wis" },
  { key: "arcana", name: "Arcana", de: "Arkane Kunde", ability: "int" },
  { key: "athletics", name: "Athletics", de: "Athletik", ability: "str" },
  { key: "deception", name: "Deception", de: "Täuschen", ability: "cha" },
  { key: "history", name: "History", de: "Geschichte", ability: "int" },
  { key: "insight", name: "Insight", de: "Motiv erkennen", ability: "wis" },
  { key: "intimidation", name: "Intimidation", de: "Einschüchtern", ability: "cha" },
  { key: "investigation", name: "Investigation", de: "Nachforschung", ability: "int" },
  { key: "medicine", name: "Medicine", de: "Heilkunde", ability: "wis" },
  { key: "nature", name: "Nature", de: "Naturkunde", ability: "int" },
  { key: "perception", name: "Perception", de: "Wahrnehmung", ability: "wis" },
  { key: "performance", name: "Performance", de: "Auftreten", ability: "cha" },
  { key: "persuasion", name: "Persuasion", de: "Überzeugen", ability: "cha" },
  { key: "religion", name: "Religion", de: "Religion", ability: "int" },
  { key: "sleight-of-hand", name: "Sleight of Hand", de: "Fingerfertigkeit", ability: "dex" },
  { key: "stealth", name: "Stealth", de: "Heimlichkeit", ability: "dex" },
  { key: "survival", name: "Survival", de: "Überlebenskunst", ability: "wis" },
] as const;

export const ABILITY_LABELS: Record<Ability, { name: string; de: string }> = {
  str: { name: "STR", de: "Stärke" },
  dex: { name: "DEX", de: "Geschicklichkeit" },
  con: { name: "CON", de: "Konstitution" },
  int: { name: "INT", de: "Intelligenz" },
  wis: { name: "WIS", de: "Weisheit" },
  cha: { name: "CHA", de: "Charisma" },
};
