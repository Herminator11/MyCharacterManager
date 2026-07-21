import { describe, expect, it } from "vitest";

import {
  combinedCasterLevel,
  pactMagicSlots,
  proficiencyBonus,
  spellcastingSlots,
  totalLevel,
} from "./multiclass";

const sorcerer = (level: number) => ({ classKey: "sorcerer", level });
const warlock = (level: number) => ({ classKey: "warlock", level });
const paladin = (level: number) => ({ classKey: "paladin", level });
const wizard = (level: number) => ({ classKey: "wizard", level });
const barbarian = (level: number) => ({ classKey: "barbarian", level });

describe("proficiencyBonus", () => {
  it.each([
    [1, 2],
    [4, 2],
    [5, 3],
    [8, 3],
    [9, 4],
    [12, 4],
    [13, 5],
    [16, 5],
    [17, 6],
    [20, 6],
  ])("Gesamtlevel %i → +%i", (level, expected) => {
    expect(proficiencyBonus([wizard(level)])).toBe(expected);
  });

  it("summiert über alle Klassen", () => {
    expect(totalLevel([sorcerer(3), warlock(2)])).toBe(5);
    expect(proficiencyBonus([sorcerer(3), warlock(2)])).toBe(3);
  });
});

describe("spellcastingSlots — einzelne Klasse", () => {
  it("Sorcerer 5 hat 4/3/2", () => {
    expect(spellcastingSlots([sorcerer(5)])).toEqual([
      4, 3, 2, 0, 0, 0, 0, 0, 0,
    ]);
  });

  it("Wizard 20 entspricht der vollen Tabelle", () => {
    expect(spellcastingSlots([wizard(20)])).toEqual([
      4, 3, 3, 3, 3, 2, 2, 1, 1,
    ]);
  });

  it("Paladin 1 hat noch keine Zauberplätze", () => {
    expect(spellcastingSlots([paladin(1)])).toEqual([
      0, 0, 0, 0, 0, 0, 0, 0, 0,
    ]);
  });

  it("Barbar bekommt gar keine", () => {
    expect(spellcastingSlots([barbarian(10)])).toEqual([
      0, 0, 0, 0, 0, 0, 0, 0, 0,
    ]);
  });

  it("Halbcaster allein nutzt die eigene Tabelle, nicht die Multiclass-Tabelle", () => {
    // Der Grenzfall, den man leicht falsch macht: Paladin 5 hat nach eigener
    // Tabelle 4/2. Über den kombinierten Caster-Level (floor(5/2) = 2) käme
    // man dagegen auf 3/0 — das wäre zu wenig.
    expect(spellcastingSlots([paladin(5)])).toEqual([4, 2, 0, 0, 0, 0, 0, 0, 0]);
    expect(combinedCasterLevel([paladin(5)])).toBe(2);
  });

  it("eine Nicht-Casterklasse dazu ändert daran nichts", () => {
    // Solange nur eine Klasse überhaupt zaubert, gilt weiter deren Tabelle.
    expect(spellcastingSlots([paladin(5), barbarian(3)])).toEqual([
      4, 2, 0, 0, 0, 0, 0, 0, 0,
    ]);
  });
});

describe("spellcastingSlots — Multiclass", () => {
  it("Warlock zählt nicht zum kombinierten Caster-Level", () => {
    expect(combinedCasterLevel([sorcerer(3), warlock(2)])).toBe(3);
  });

  it("halbe Caster runden ab", () => {
    // Paladin 5 → 2, Wizard 3 → 3, zusammen Caster-Level 5.
    expect(combinedCasterLevel([paladin(5), wizard(3)])).toBe(5);
    expect(spellcastingSlots([paladin(5), wizard(3)])).toEqual([
      4, 3, 2, 0, 0, 0, 0, 0, 0,
    ]);
  });

  it("Sorcerer 3 / Warlock 2 nutzt nur den Sorcerer-Anteil", () => {
    // Caster-Level 3 → Multiclass-Tabelle Zeile 3: 4/2
    expect(spellcastingSlots([sorcerer(3), warlock(2)])).toEqual([
      4, 2, 0, 0, 0, 0, 0, 0, 0,
    ]);
  });

  it("reiner Warlock hat keinen normalen Pool", () => {
    expect(spellcastingSlots([warlock(5)])).toEqual([
      0, 0, 0, 0, 0, 0, 0, 0, 0,
    ]);
  });
});

describe("pactMagicSlots", () => {
  it("Warlock 1 hat einen Slot Grad 1", () => {
    expect(pactMagicSlots([warlock(1)])).toEqual([1, 0, 0, 0, 0, 0, 0, 0, 0]);
  });

  it("Warlock 5 hat zwei Slots Grad 3", () => {
    expect(pactMagicSlots([warlock(5)])).toEqual([0, 0, 2, 0, 0, 0, 0, 0, 0]);
  });

  it("bleibt beim Multiclass unabhängig vom Sorcerer-Anteil", () => {
    expect(pactMagicSlots([sorcerer(3), warlock(2)])).toEqual([
      2, 0, 0, 0, 0, 0, 0, 0, 0,
    ]);
  });

  it("ist leer ohne Warlock-Level", () => {
    expect(pactMagicSlots([sorcerer(9)])).toEqual([0, 0, 0, 0, 0, 0, 0, 0, 0]);
  });

  it("Warlock 20 hat vier Slots Grad 5", () => {
    expect(pactMagicSlots([warlock(20)])).toEqual([
      0, 0, 0, 0, 4, 0, 0, 0, 0,
    ]);
  });
});

describe("das Szenario aus dem Anforderungsdokument", () => {
  // "Sorcerer/Warlock, beide bieten Grad 2 an" — genau der Fall, für den es
  // zwei getrennte Pools braucht.
  const build = [sorcerer(4), warlock(3)];

  it("beide Pools bieten Grad 2, aber unabhängig voneinander", () => {
    expect(spellcastingSlots(build)[1]).toBe(3); // Caster-Level 4 → 4/3
    expect(pactMagicSlots(build)[1]).toBe(2); // Warlock 3 → 2× Grad 2
  });
});
