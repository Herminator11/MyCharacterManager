import { describe, expect, it } from "vitest";

import { CLASSES } from "./classes";
import type { AbilityScores } from "./derive";
import { derivePools, POOL_PACT_MAGIC, POOL_SPELLCASTING } from "./derivePools";
import { deriveResources } from "./resourceTemplates";

/**
 * Belegt, dass die Ableitung für **alle dreizehn** Klassen durchläuft und
 * plausibles Zeug liefert — nicht nur für den Sorcerer/Warlock, mit dem die
 * App entwickelt wurde.
 *
 * Der Anlass: von außen sieht die App aus, als kenne sie nur zwei Klassen.
 * Sie kennt alle; was fehlte, war der Nachweis. Ohne ihn fällt eine
 * kaputte Klasse erst am Spieltisch auf, und zwar dem, der sie spielt.
 */

const LEVELS = [1, 5, 11, 20] as const;

const scores: AbilityScores = {
  str: 14,
  dex: 14,
  con: 14,
  int: 14,
  wis: 14,
  cha: 14,
};

describe("Alle Klassen laufen durch", () => {
  for (const def of CLASSES) {
    for (const level of LEVELS) {
      it(`${def.name} ${level}`, () => {
        const classes = [{ classKey: def.key, level }];

        const pools = derivePools(classes);
        const resources = deriveResources(classes, scores);

        // Kein Pool ohne Slots, keine Ressource ohne Maximum: beides wären
        // leere Reihen im Dashboard, die nichts zählen.
        for (const pool of pools) {
          expect(pool.slots.some((n) => n > 0)).toBe(true);
          expect(pool.slots).toHaveLength(9);
        }
        for (const resource of resources) {
          expect(resource.max).toBeGreaterThan(0);
          expect(resource.name).not.toBe("");
        }

        // Stabile Schlüssel — daran erkennt die Synchronisation wieder,
        // was sie schon angelegt hat.
        const keys = [...pools, ...resources].map((x) => x.autoKey);
        expect(new Set(keys).size).toBe(keys.length);
      });
    }
  }
});

describe("Wer bekommt überhaupt Zauberplätze", () => {
  const poolKeysAt = (classKey: string, level: number) =>
    derivePools([{ classKey, level }]).map((p) => p.autoKey);

  it("lässt die vier Nicht-Caster leer", () => {
    for (const classKey of ["barbarian", "fighter", "monk", "rogue"]) {
      expect(poolKeysAt(classKey, 20)).toEqual([]);
    }
  });

  it("gibt jedem Vollcaster ab Stufe 1 den gemeinsamen Pool", () => {
    for (const classKey of ["bard", "cleric", "druid", "sorcerer", "wizard"]) {
      expect(poolKeysAt(classKey, 1)).toEqual([POOL_SPELLCASTING]);
    }
  });

  it("lässt Paladin und Ranger auf Stufe 1 noch warten", () => {
    // Halbcaster runden ab: erst Stufe 2 ergibt Caster-Level 1.
    expect(poolKeysAt("paladin", 1)).toEqual([]);
    expect(poolKeysAt("ranger", 1)).toEqual([]);
    expect(poolKeysAt("paladin", 2)).toEqual([POOL_SPELLCASTING]);
    expect(poolKeysAt("ranger", 2)).toEqual([POOL_SPELLCASTING]);
  });

  it("gibt dem Artificer schon auf Stufe 1 welche — er rundet auf", () => {
    expect(poolKeysAt("artificer", 1)).toEqual([POOL_SPELLCASTING]);
  });

  it("gibt dem Warlock nie den gemeinsamen Pool", () => {
    for (const level of LEVELS) {
      expect(poolKeysAt("warlock", level)).toEqual([POOL_PACT_MAGIC]);
    }
  });
});

describe("Was jede Klasse auf Stufe 20 zu zählen hat", () => {
  const keysAt20 = (classKey: string) =>
    deriveResources([{ classKey, level: 20 }], scores).map((r) => r.autoKey);

  it("gibt den zehn Klassen mit Ressourcen ihre", () => {
    const expected: Record<string, string[]> = {
      barbarian: ["barbarian:rage"],
      bard: ["bard:bardic-inspiration"],
      cleric: ["cleric:channel-divinity"],
      druid: ["druid:wild-shape"],
      fighter: ["fighter:action-surge", "fighter:indomitable"],
      monk: ["monk:ki"],
      paladin: ["paladin:lay-on-hands"],
      sorcerer: ["sorcerer:sorcery-points"],
      warlock: ["warlock:mystic-arcanum"],
      wizard: ["wizard:arcane-recovery"],
    };

    for (const [classKey, keys] of Object.entries(expected)) {
      expect(keysAt20(classKey)).toEqual(keys);
    }
  });

  it("lässt Rogue, Ranger und Artificer bewusst ohne", () => {
    // Keine Lücke: das SRD gibt ihnen keinen Zähler, der sich je Rast
    // erholt. Sneak Attack und Favored Enemy sind keine Vorräte.
    expect(keysAt20("rogue")).toEqual([]);
    expect(keysAt20("ranger")).toEqual([]);
    expect(keysAt20("artificer")).toEqual([]);
  });
});
