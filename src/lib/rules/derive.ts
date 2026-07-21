import type { Ability } from "@/db/schema";

import { getClass } from "./classes";
import { proficiencyBonus, totalLevel, type ClassLevel } from "./multiclass";
import { SKILLS } from "./skills";

/**
 * Ableitung aller Werte, die sich aus Attributen, Klassen und Proficiencies
 * ergeben. Jeder Wert lässt sich am Charakter überschreiben — die Ableitung
 * ist Startkomfort, kein Zwang.
 */

export type AbilityScores = Record<Ability, number>;

/** Proficiency-Grad pro Schlüssel: 0 = keine, 1 = proficient, 2 = Expertise. */
export type ProficiencyMap = Record<string, { level: number; miscBonus: number }>;

/** 5e-Modifikator: (Wert − 10) halbiert, immer abgerundet. */
export function abilityModifier(score: number): number {
  return Math.floor((score - 10) / 2);
}

/** Vorzeichenbehaftete Anzeige, z.B. "+3" oder "−1". */
export function formatModifier(value: number): string {
  return value < 0 ? `−${Math.abs(value)}` : `+${value}`;
}

export function savingThrow(
  scores: AbilityScores,
  ability: Ability,
  classes: readonly ClassLevel[],
  proficiencies: ProficiencyMap,
): number {
  const entry = proficiencies[ability];
  const profLevel = entry?.level ?? 0;
  return (
    abilityModifier(scores[ability]) +
    profLevel * proficiencyBonus(classes) +
    (entry?.miscBonus ?? 0)
  );
}

export function skillBonus(
  scores: AbilityScores,
  skillKey: string,
  classes: readonly ClassLevel[],
  proficiencies: ProficiencyMap,
): number {
  const skill = SKILLS.find((s) => s.key === skillKey);
  if (!skill) return 0;
  const entry = proficiencies[skillKey];
  const profLevel = entry?.level ?? 0;
  return (
    abilityModifier(scores[skill.ability]) +
    profLevel * proficiencyBonus(classes) +
    (entry?.miscBonus ?? 0)
  );
}

/** Passiver Wert einer Fertigkeit: 10 + Bonus. */
export function passiveScore(
  scores: AbilityScores,
  skillKey: string,
  classes: readonly ClassLevel[],
  proficiencies: ProficiencyMap,
): number {
  return 10 + skillBonus(scores, skillKey, classes, proficiencies);
}

/** Initiative entspricht dem DEX-Modifikator. */
export function initiative(scores: AbilityScores): number {
  return abilityModifier(scores.dex);
}

/** Unrüstige AC: 10 + DEX. Rüstung trägt der Nutzer als Override ein. */
export function baseArmorClass(scores: AbilityScores): number {
  return 10 + abilityModifier(scores.dex);
}

/**
 * Maximale HP nach der gebräuchlichen "Durchschnitt"-Regel: die
 * Ursprungsklasse gibt den vollen Trefferwürfel, jedes weitere Level den
 * aufgerundeten Durchschnitt, plus CON-Modifikator pro Level.
 *
 * Nur ein Startvorschlag — wer würfelt, trägt den Wert als Override ein.
 */
export function suggestedMaxHp(
  scores: AbilityScores,
  classes: readonly ClassLevel[],
): number {
  if (classes.length === 0) return 0;

  const con = abilityModifier(scores.con);
  const ordered = [...classes];
  let hp = 0;
  let firstLevelTaken = false;

  for (const entry of ordered) {
    const die = getClass(entry.classKey)?.hitDie ?? 8;
    const average = Math.floor(die / 2) + 1;
    let levels = entry.level;

    if (!firstLevelTaken) {
      hp += die;
      levels -= 1;
      firstLevelTaken = true;
    }
    hp += levels * average;
  }

  return Math.max(1, hp + con * totalLevel(classes));
}

/** Zauber-Rettungswurf-DC: 8 + Proficiency + Zauberattribut. */
export function spellSaveDc(
  scores: AbilityScores,
  ability: Ability,
  classes: readonly ClassLevel[],
): number {
  return 8 + proficiencyBonus(classes) + abilityModifier(scores[ability]);
}

/** Zauber-Angriffsbonus: Proficiency + Zauberattribut. */
export function spellAttackBonus(
  scores: AbilityScores,
  ability: Ability,
  classes: readonly ClassLevel[],
): number {
  return proficiencyBonus(classes) + abilityModifier(scores[ability]);
}

/** Waffen-Angriffsbonus: Attribut + Proficiency, falls geübt. */
export function attackBonus(
  scores: AbilityScores,
  ability: Ability,
  proficient: boolean,
  classes: readonly ClassLevel[],
): number {
  return (
    abilityModifier(scores[ability]) +
    (proficient ? proficiencyBonus(classes) : 0)
  );
}

/** Gesamtwert des Geldbeutels in Kupfer. */
export function totalCopper(purse: {
  cp: number;
  sp: number;
  ep: number;
  gp: number;
  pp: number;
}): number {
  return (
    purse.cp + purse.sp * 10 + purse.ep * 50 + purse.gp * 100 + purse.pp * 1000
  );
}

/** Kupfer als Goldwert mit zwei Nachkommastellen. */
export function copperToGold(copper: number): number {
  return Math.round(copper) / 100;
}
