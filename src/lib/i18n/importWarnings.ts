import type { ImportWarning } from "@/lib/import/types";

import type { Messages } from "./messages";

/** Ein Import-Hinweis als Satz in der Sprache des Geräts. */
export function renderImportWarning(t: Messages, warning: ImportWarning): string {
  const w = t.importWarnings;
  switch (warning.key) {
    case "unknownClass":
      return w.unknownClass(warning.params.name);
    case "missingLevel":
      return w.missingLevel(warning.params.name);
    case "derivedHitDice":
      return w.derivedHitDice(warning.params.dice, t.term.hitDice);
    case "missingExpertise":
      return w.missingExpertise(warning.params.classes);
    case "missingScore":
      return w.missingScore(warning.params.ability);
    case "noClass":
      return w.noClass(t.term.hitDice);
    case "noWeapon":
      return w.noWeapon;
    case "noWeaponOrSpellAttack":
      return w.noWeaponOrSpellAttack;
    case "usedSlots":
      return w.usedSlots(warning.params.count);
    case "deathSaves":
      return w.deathSaves(t.term.deathSaves);
    case "deathSavesCounted":
      return w.deathSavesCounted(
        t.term.deathSaves,
        warning.params.successes,
        warning.params.failures,
      );
    case "emptyCurrentHp":
      return w.emptyCurrentHp(t.term.hitPointsShort);
    case "unparsedClassLine":
      return w.unparsedClassLine(warning.params.line);
  }
}
