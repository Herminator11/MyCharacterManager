import type { Ability, Recovery } from "@/db/schema";

import { getClass } from "./classes";
import { pactMagicSlots, spellcastingSlots, type ClassLevel } from "./multiclass";

/**
 * Welche Zauberplatz-Pools ein Charakter aufgrund seiner Klassen haben soll.
 *
 * Es sind bewusst zwei getrennte Pools statt einer Tabelle: der gemeinsame
 * Spellcasting-Pool erholt sich bei langer Rast, Pact Magic schon bei kurzer.
 * Beide können denselben Grad anbieten — genau deshalb fragt der Cast-Dialog
 * nach, welcher Pool benutzt werden soll.
 */

export const POOL_SPELLCASTING = "spellcasting";
export const POOL_PACT_MAGIC = "pact-magic";

export type DerivedPool = {
  autoKey: string;
  name: string;
  recovery: Recovery;
  spellcastingAbility: Ability;
  /** Slots für Grad 1–9. */
  slots: readonly number[];
  sortOrder: number;
};

/**
 * Zauberattribut des gemeinsamen Pools. Bei Multiclass entscheidet die
 * Klasse mit dem höchsten Level — bei Gleichstand die erstgenannte.
 */
function primaryCastingAbility(classes: readonly ClassLevel[]): Ability {
  let best: { ability: Ability; level: number } | undefined;

  for (const entry of classes) {
    const def = getClass(entry.classKey);
    if (!def?.spellcastingAbility) continue;
    if (def.caster === "pact") continue;
    if (!best || entry.level > best.level) {
      best = { ability: def.spellcastingAbility, level: entry.level };
    }
  }

  return best?.ability ?? "int";
}

export function derivePools(classes: readonly ClassLevel[]): DerivedPool[] {
  const pools: DerivedPool[] = [];

  const spellcasting = spellcastingSlots(classes);
  if (spellcasting.some((n) => n > 0)) {
    pools.push({
      autoKey: POOL_SPELLCASTING,
      name: "Zauberplätze",
      recovery: "long",
      spellcastingAbility: primaryCastingAbility(classes),
      slots: spellcasting,
      sortOrder: 0,
    });
  }

  const pact = pactMagicSlots(classes);
  if (pact.some((n) => n > 0)) {
    pools.push({
      autoKey: POOL_PACT_MAGIC,
      name: "Pact Magic",
      recovery: "short",
      spellcastingAbility: "cha",
      slots: pact,
      sortOrder: 1,
    });
  }

  return pools;
}
