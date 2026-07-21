import type { Ability, Recovery } from "@/db/schema";

import { abilityModifier, type AbilityScores } from "./derive";
import { PROGRESSION } from "./progression.generated";

/**
 * Klassenressourcen, die als Zähler am Dashboard erscheinen.
 *
 * Die meisten Werte kommen direkt aus `class_specific` der SRD-Progression.
 * Ein paar Ressourcen stehen dort aber nicht drin (Wild Shape, Lay on Hands),
 * weil das SRD sie im Fließtext des Klassenfeatures beschreibt — die stehen
 * hier explizit.
 *
 * Alles hier Abgeleitete lässt sich am Charakter überschreiben: sobald eine
 * Ressource auf `source = 'manual'` steht, fasst die Synchronisation sie
 * nicht mehr an.
 */

export type TemplateContext = {
  classLevel: number;
  /** class_specific des jeweiligen Klassenlevels. */
  specific: Readonly<Record<string, number>>;
  scores: AbilityScores;
};

export type ResourceTemplate = {
  /** Stabiler Schlüssel, unter dem die Ressource wiedererkannt wird. */
  autoKey: string;
  classKey: string;
  name: string;
  recovery: Recovery | ((ctx: TemplateContext) => Recovery);
  display: "pips" | "counter";
  /** Maximum; 0 oder weniger bedeutet: Ressource gibt es noch nicht. */
  max: (ctx: TemplateContext) => number;
  note?: (ctx: TemplateContext) => string;
};

/** Maximum aus einem class_specific-Schlüssel. */
const fromSpecific =
  (key: string) =>
  ({ specific }: TemplateContext) =>
    specific[key] ?? 0;

/** Modifikator eines Attributs, mindestens 1 — Muster vieler Klassenfeatures. */
const modifierAtLeastOne =
  (ability: Ability) =>
  ({ scores }: TemplateContext) =>
    Math.max(1, abilityModifier(scores[ability]));

export const RESOURCE_TEMPLATES: readonly ResourceTemplate[] = [
  {
    autoKey: "barbarian:rage",
    classKey: "barbarian",
    name: "Rage",
    recovery: "long",
    display: "pips",
    max: fromSpecific("rage_count"),
    note: ({ specific }) =>
      specific.rage_damage_bonus
        ? `+${specific.rage_damage_bonus} Schaden`
        : "",
  },
  {
    autoKey: "bard:bardic-inspiration",
    classKey: "bard",
    name: "Bardic Inspiration",
    // Ab Stufe 5 (Font of Inspiration) erholt sie sich auch bei kurzer Rast.
    recovery: ({ classLevel }) => (classLevel >= 5 ? "short" : "long"),
    display: "pips",
    // Die Anzahl ist der CHA-Modifikator; die Progression liefert nur die
    // Würfelgröße.
    max: modifierAtLeastOne("cha"),
    note: ({ specific }) =>
      specific.bardic_inspiration_die
        ? `d${specific.bardic_inspiration_die}`
        : "",
  },
  {
    autoKey: "cleric:channel-divinity",
    classKey: "cleric",
    name: "Channel Divinity",
    recovery: "short",
    display: "pips",
    max: fromSpecific("channel_divinity_charges"),
  },
  {
    autoKey: "druid:wild-shape",
    classKey: "druid",
    name: "Wild Shape",
    recovery: "short",
    display: "pips",
    // Steht nicht in class_specific — ab Stufe 2 zweimal pro kurzer Rast.
    max: ({ classLevel }) => (classLevel >= 2 ? 2 : 0),
  },
  {
    autoKey: "fighter:action-surge",
    classKey: "fighter",
    name: "Action Surge",
    recovery: "short",
    display: "pips",
    max: fromSpecific("action_surges"),
  },
  {
    autoKey: "fighter:indomitable",
    classKey: "fighter",
    name: "Indomitable",
    recovery: "long",
    display: "pips",
    max: fromSpecific("indomitable_uses"),
  },
  {
    autoKey: "monk:ki",
    classKey: "monk",
    name: "Ki",
    recovery: "short",
    display: "counter",
    max: fromSpecific("ki_points"),
  },
  {
    autoKey: "paladin:lay-on-hands",
    classKey: "paladin",
    name: "Lay on Hands",
    recovery: "long",
    display: "counter",
    // Auch das steht nur im Fließtext: 5 Trefferpunkte pro Paladin-Level.
    max: ({ classLevel }) => classLevel * 5,
    note: () => "Trefferpunkte",
  },
  {
    autoKey: "sorcerer:sorcery-points",
    classKey: "sorcerer",
    name: "Sorcery Points",
    recovery: "long",
    display: "counter",
    max: fromSpecific("sorcery_points"),
  },
  {
    autoKey: "warlock:mystic-arcanum",
    classKey: "warlock",
    name: "Mystic Arcanum",
    recovery: "long",
    display: "pips",
    // Je ein Einsatz für Grad 6–9, sobald freigeschaltet.
    max: ({ specific }) =>
      [6, 7, 8, 9].filter(
        (level) => (specific[`mystic_arcanum_level_${level}`] ?? 0) > 0,
      ).length,
    note: ({ specific }) => {
      const levels = [6, 7, 8, 9].filter(
        (level) => (specific[`mystic_arcanum_level_${level}`] ?? 0) > 0,
      );
      return levels.length ? `Grad ${levels.join(", ")}` : "";
    },
  },
  {
    autoKey: "wizard:arcane-recovery",
    classKey: "wizard",
    name: "Arcane Recovery",
    recovery: "long",
    display: "pips",
    max: ({ classLevel }) => (classLevel >= 1 ? 1 : 0),
    note: ({ specific }) =>
      specific.arcane_recovery_levels
        ? `bis ${specific.arcane_recovery_levels} Slot-Grade`
        : "",
  },
] as const;

export type DerivedResource = {
  autoKey: string;
  name: string;
  max: number;
  recovery: Recovery;
  display: "pips" | "counter";
  note: string;
};

/**
 * Ressourcen, die ein Charakter aufgrund seiner Klassen und Level haben
 * sollte. Ressourcen mit Maximum 0 werden weggelassen.
 */
export function deriveResources(
  classes: readonly { classKey: string; level: number }[],
  scores: AbilityScores,
): DerivedResource[] {
  const out: DerivedResource[] = [];

  for (const entry of classes) {
    const level = Math.min(Math.max(entry.level, 1), 20);
    const specific = PROGRESSION[entry.classKey]?.[level]?.specific ?? {};
    const ctx: TemplateContext = { classLevel: level, specific, scores };

    for (const template of RESOURCE_TEMPLATES) {
      if (template.classKey !== entry.classKey) continue;
      const max = template.max(ctx);
      if (max <= 0) continue;

      out.push({
        autoKey: template.autoKey,
        name: template.name,
        max,
        recovery:
          typeof template.recovery === "function"
            ? template.recovery(ctx)
            : template.recovery,
        display: template.display,
        note: template.note?.(ctx) ?? "",
      });
    }
  }

  return out;
}
