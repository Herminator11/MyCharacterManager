import { ABILITIES, type Ability } from "@/db/schema";

import { abilityModifier, formatModifier, type AbilityScores } from "./derive";
import { ABILITY_LABELS } from "./skills";

/**
 * Spezies — was sie mitbringt, und was das für die Attribute hieße.
 *
 * Die entscheidende Zurückhaltung steckt im Konjunktiv: **nichts hier wird
 * automatisch aufgerechnet.** Die gespeicherten Attributswerte sind immer
 * die Endwerte, so wie sie auf dem Bogen stehen. Aurora druckt die
 * Rassenboni bereits ein; würde die App sie beim Anzeigen noch einmal
 * addieren, wäre jeder importierte Charakter still zu stark — und niemand
 * käme darauf, das ausgerechnet bei der Spezies zu suchen.
 *
 * Stattdessen zeigt die App den Bonus an und bietet einmalig an, ihn zu
 * übernehmen. Sie zählt, sie entscheidet nicht.
 */

export type SpeciesTrait = { name: string; description: string };

export type SpeciesDef = {
  key: string;
  name: string;
  parentKey: string;
  speed: number;
  size: string;
  /** Nur die Attribute, die etwas bekommen. */
  abilityBonuses: Partial<Record<Ability, number>>;
  traits: SpeciesTrait[];
  /** Was das Regelwerk offenlässt, als Erinnerung. Kann leer sein. */
  choiceNote: string;
};

/** Die sechs Attribute in Bogenreihenfolge, gefiltert auf gesetzte Boni. */
export function bonusEntries(
  def: Pick<SpeciesDef, "abilityBonuses">,
): { ability: Ability; bonus: number }[] {
  return ABILITIES.flatMap((ability) => {
    const bonus = def.abilityBonuses[ability];
    return bonus ? [{ ability, bonus }] : [];
  });
}

/** "+2 CHA · +1 INT" — für die Zeile neben dem Spezies-Namen. */
export function bonusSummary(def: Pick<SpeciesDef, "abilityBonuses">): string {
  return bonusEntries(def)
    .map(
      ({ ability, bonus }) =>
        `${formatModifier(bonus)} ${ABILITY_LABELS[ability].name}`,
    )
    .join(" · ");
}

/**
 * Die Attributswerte, wie sie nach dem Übernehmen aussähen.
 *
 * Rein — der Aufrufer entscheidet, ob das Ergebnis gespeichert wird. Über 20
 * hinaus wird nicht geklemmt: das Maximum von 20 gilt für Attributs-
 * verbesserungen, nicht für Spezies-Boni, und Wünsche oder Handschuhe der
 * Riesenkraft heben es ohnehin auf.
 */
export function withSpeciesBonuses(
  scores: AbilityScores,
  def: Pick<SpeciesDef, "abilityBonuses">,
): AbilityScores {
  const next = { ...scores };
  for (const { ability, bonus } of bonusEntries(def)) {
    next[ability] = next[ability] + bonus;
  }
  return next;
}

/** Die Gegenrichtung — zieht ab, was `withSpeciesBonuses` addiert hat. */
export function withoutSpeciesBonuses(
  scores: AbilityScores,
  def: Pick<SpeciesDef, "abilityBonuses">,
): AbilityScores {
  const next = { ...scores };
  for (const { ability, bonus } of bonusEntries(def)) {
    next[ability] = next[ability] - bonus;
  }
  return next;
}

/**
 * Was das Übernehmen an den Modifikatoren ändern würde — Grundlage für den
 * Hinweis am Knopf.
 *
 * Zeigt nur die Attribute, bei denen sich der *Modifikator* bewegt: dass CHA
 * von 15 auf 17 steigt, ist am Tisch folgenlos, solange +2 stehen bleibt.
 */
export function modifierChanges(
  scores: AbilityScores,
  def: Pick<SpeciesDef, "abilityBonuses">,
): { ability: Ability; from: number; to: number }[] {
  const after = withSpeciesBonuses(scores, def);

  return bonusEntries(def).flatMap(({ ability }) => {
    const from = abilityModifier(scores[ability]);
    const to = abilityModifier(after[ability]);
    return from === to ? [] : [{ ability, from, to }];
  });
}

/**
 * Normalisierung für den Abgleich zwischen PDF-Text und Katalog.
 *
 * Der Bogen schreibt „Half-Elf", „half elf" oder „Halfelf", je nachdem, wer
 * ihn ausgefüllt hat. Alles außer Buchstaben und Ziffern fliegt raus.
 */
export function normalizeSpeciesName(raw: string): string {
  return raw
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}
