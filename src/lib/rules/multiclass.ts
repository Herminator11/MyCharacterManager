import { getClass } from "./classes";
import { PROGRESSION } from "./progression.generated";

/**
 * Zauberplatz-Ableitung für Multiclass-Charaktere.
 *
 * Die zentrale Regel, die man leicht falsch implementiert: bei Multiclassing
 * sind die Zauberplätze **nicht** die Summe der Einzeltabellen. Stattdessen
 * wird ein kombinierter Caster-Level gebildet und damit *eine* gemeinsame
 * Multiclass-Tabelle nachgeschlagen.
 *
 * Warlocks Pact Magic ist davon ausdrücklich ausgenommen und bleibt ein
 * eigener Pool mit eigener Tabelle und eigener Erholungsregel (kurze Rast).
 */

export type ClassLevel = { classKey: string; level: number };

/** Multiclass-Zauberplatztabelle: Index = Caster-Level 1–20, Werte = Grad 1–9. */
const MULTICLASS_SLOTS: readonly (readonly number[])[] = [
  [0, 0, 0, 0, 0, 0, 0, 0, 0], // Caster-Level 0
  [2, 0, 0, 0, 0, 0, 0, 0, 0],
  [3, 0, 0, 0, 0, 0, 0, 0, 0],
  [4, 2, 0, 0, 0, 0, 0, 0, 0],
  [4, 3, 0, 0, 0, 0, 0, 0, 0],
  [4, 3, 2, 0, 0, 0, 0, 0, 0],
  [4, 3, 3, 0, 0, 0, 0, 0, 0],
  [4, 3, 3, 1, 0, 0, 0, 0, 0],
  [4, 3, 3, 2, 0, 0, 0, 0, 0],
  [4, 3, 3, 3, 1, 0, 0, 0, 0],
  [4, 3, 3, 3, 2, 0, 0, 0, 0],
  [4, 3, 3, 3, 2, 1, 0, 0, 0],
  [4, 3, 3, 3, 2, 1, 0, 0, 0],
  [4, 3, 3, 3, 2, 1, 1, 0, 0],
  [4, 3, 3, 3, 2, 1, 1, 0, 0],
  [4, 3, 3, 3, 2, 1, 1, 1, 0],
  [4, 3, 3, 3, 2, 1, 1, 1, 0],
  [4, 3, 3, 3, 2, 1, 1, 1, 1],
  [4, 3, 3, 3, 3, 1, 1, 1, 1],
  [4, 3, 3, 3, 3, 2, 1, 1, 1],
  [4, 3, 3, 3, 3, 2, 2, 1, 1], // Caster-Level 20
];

/** Gesamtlevel über alle Klassen — Basis für den Proficiency Bonus. */
export function totalLevel(classes: readonly ClassLevel[]): number {
  return classes.reduce((sum, c) => sum + c.level, 0);
}

/** Proficiency Bonus aus dem Gesamtlevel: +2 ab 1, dann alle 4 Level +1. */
export function proficiencyBonus(classes: readonly ClassLevel[]): number {
  const level = Math.max(1, totalLevel(classes));
  return 2 + Math.floor((Math.min(level, 20) - 1) / 4);
}

/**
 * Kombinierter Caster-Level nach Multiclass-Regel.
 * Warlock trägt bewusst nichts bei.
 */
export function combinedCasterLevel(classes: readonly ClassLevel[]): number {
  let level = 0;
  for (const { classKey, level: classLevel } of classes) {
    switch (getClass(classKey)?.caster) {
      case "full":
        level += classLevel;
        break;
      case "half":
        // Paladin/Ranger bekommen erst ab Stufe 2 Zauber.
        level += Math.floor(classLevel / 2);
        break;
      case "halfUp":
        // Artificer rundet auf und hat deshalb schon auf Stufe 1 Zauber.
        level += Math.ceil(classLevel / 2);
        break;
      case "third":
        level += Math.floor(classLevel / 3);
        break;
      default:
        break;
    }
  }
  return level;
}

/**
 * Zauberplätze des gemeinsamen Pools (Grad 1–9).
 *
 * Sonderfall: eine einzelne Casterklasse benutzt ihre eigene Klassentabelle,
 * nicht die Multiclass-Tabelle. Das macht einen echten Unterschied — ein
 * Paladin 2 hat nach eigener Tabelle 2 Slots Grad 1, nach der
 * Multiclass-Tabelle (Caster-Level 1) ebenfalls 2. Aber ein Ranger 2 hätte
 * ohne diese Fallunterscheidung an anderen Stufen Abweichungen.
 */
export function spellcastingSlots(
  classes: readonly ClassLevel[],
): readonly number[] {
  const casters = classes.filter((c) => {
    const kind = getClass(c.classKey)?.caster;
    return (
      kind === "full" || kind === "half" || kind === "halfUp" || kind === "third"
    );
  });

  if (casters.length === 0) return Array(9).fill(0);

  if (casters.length === 1) {
    const only = casters[0];
    // Klassen ohne eigene Tabelle — Artificer etwa steht nicht im SRD —
    // fallen auf die Multiclass-Tabelle zurück. Für ihn stimmt sie exakt.
    const own = PROGRESSION[only.classKey]?.[clampLevel(only.level)];
    if (own) return own.slots;
  }

  return MULTICLASS_SLOTS[Math.min(combinedCasterLevel(classes), 20)];
}

/**
 * Pact-Magic-Slots des Warlock-Anteils — komplett getrennt vom obigen Pool.
 * Rückgabe wie oben: Index 0 = Grad 1.
 */
export function pactMagicSlots(
  classes: readonly ClassLevel[],
): readonly number[] {
  const warlockLevel = classes
    .filter((c) => getClass(c.classKey)?.caster === "pact")
    .reduce((sum, c) => sum + c.level, 0);

  if (warlockLevel === 0) return Array(9).fill(0);
  return PROGRESSION.warlock?.[clampLevel(warlockLevel)]?.slots ?? Array(9).fill(0);
}

function clampLevel(level: number): number {
  return Math.min(Math.max(level, 1), 20);
}
