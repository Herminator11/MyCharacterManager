import { describe, expect, it } from "vitest";

import {
  abilityModifier,
  attackBonus,
  baseArmorClass,
  copperToGold,
  formatModifier,
  passiveScore,
  savingThrow,
  skillBonus,
  spellSaveDc,
  suggestedMaxHp,
  totalCopper,
  type AbilityScores,
} from "./derive";

const scores: AbilityScores = {
  str: 8,
  dex: 14,
  con: 15,
  int: 10,
  wis: 12,
  cha: 18,
};

const sorcerer5 = [{ classKey: "sorcerer", level: 5 }];

describe("abilityModifier", () => {
  it.each([
    [1, -5],
    [8, -1],
    [9, -1],
    [10, 0],
    [11, 0],
    [15, 2],
    [18, 4],
    [20, 5],
    [30, 10],
  ])("Wert %i → Modifikator %i", (score, expected) => {
    expect(abilityModifier(score)).toBe(expected);
  });

  it("rundet auch bei ungeraden Werten korrekt ab", () => {
    // Klassischer Fehler: 9 muss −1 ergeben, nicht 0.
    expect(abilityModifier(9)).toBe(-1);
    expect(abilityModifier(7)).toBe(-2);
  });
});

describe("formatModifier", () => {
  it("setzt immer ein Vorzeichen", () => {
    expect(formatModifier(3)).toBe("+3");
    expect(formatModifier(0)).toBe("+0");
    expect(formatModifier(-2)).toBe("−2");
  });
});

describe("savingThrow", () => {
  it("addiert den Proficiency Bonus nur bei Übung", () => {
    expect(savingThrow(scores, "cha", sorcerer5, { cha: { level: 1, miscBonus: 0 } })).toBe(7); // 4 + 3
    expect(savingThrow(scores, "cha", sorcerer5, {})).toBe(4);
  });

  it("verdoppelt bei Expertise", () => {
    expect(savingThrow(scores, "con", sorcerer5, { con: { level: 2, miscBonus: 0 } })).toBe(8); // 2 + 6
  });

  it("berücksichtigt einen manuellen Zusatzbonus", () => {
    expect(savingThrow(scores, "wis", sorcerer5, { wis: { level: 0, miscBonus: 2 } })).toBe(3);
  });
});

describe("skillBonus", () => {
  it("nutzt das Attribut der Fertigkeit", () => {
    // Stealth ist DEX-basiert: +2, mit Proficiency +3 → 5
    expect(skillBonus(scores, "stealth", sorcerer5, { stealth: { level: 1, miscBonus: 0 } })).toBe(5);
  });

  it("liefert 0 für unbekannte Fertigkeiten", () => {
    expect(skillBonus(scores, "basket-weaving", sorcerer5, {})).toBe(0);
  });
});

describe("passiveScore", () => {
  it("ist 10 plus Fertigkeitsbonus", () => {
    // Perception ist WIS: +1, ohne Proficiency → 11
    expect(passiveScore(scores, "perception", sorcerer5, {})).toBe(11);
    expect(
      passiveScore(scores, "perception", sorcerer5, {
        perception: { level: 1, miscBonus: 0 },
      }),
    ).toBe(14);
  });
});

describe("baseArmorClass", () => {
  it("ist 10 plus DEX", () => {
    expect(baseArmorClass(scores)).toBe(12);
  });
});

describe("suggestedMaxHp", () => {
  it("gibt der Ursprungsklasse den vollen Trefferwürfel", () => {
    // Sorcerer d6, Level 1, CON +2 → 6 + 2 = 8
    expect(suggestedMaxHp(scores, [{ classKey: "sorcerer", level: 1 }])).toBe(8);
  });

  it("rechnet Folgelevel mit dem aufgerundeten Durchschnitt", () => {
    // Sorcerer 5: 6 + 4×4 = 22, plus CON 2×5 = 10 → 32
    expect(suggestedMaxHp(scores, sorcerer5)).toBe(32);
  });

  it("gibt den vollen Würfel nur einmal, auch bei Multiclass", () => {
    // Sorcerer 3 (6 + 2×4 = 14) + Warlock 2 (2×5 = 10) = 24, plus CON 2×5 = 10
    expect(
      suggestedMaxHp(scores, [
        { classKey: "sorcerer", level: 3 },
        { classKey: "warlock", level: 2 },
      ]),
    ).toBe(34);
  });

  it("fällt nie unter 1", () => {
    const frail: AbilityScores = { ...scores, con: 1 };
    expect(suggestedMaxHp(frail, [{ classKey: "sorcerer", level: 1 }])).toBe(1);
  });

  it("ist 0 ohne Klassen", () => {
    expect(suggestedMaxHp(scores, [])).toBe(0);
  });
});

describe("spellSaveDc", () => {
  it("ist 8 + Proficiency + Zauberattribut", () => {
    // Sorcerer 5: 8 + 3 + CHA 4 = 15
    expect(spellSaveDc(scores, "cha", sorcerer5)).toBe(15);
  });
});

describe("attackBonus", () => {
  it("addiert Proficiency nur bei geübter Waffe", () => {
    expect(attackBonus(scores, "dex", true, sorcerer5)).toBe(5);
    expect(attackBonus(scores, "dex", false, sorcerer5)).toBe(2);
  });

  it("kann negativ werden", () => {
    expect(attackBonus(scores, "str", false, sorcerer5)).toBe(-1);
  });
});

describe("Geldbeutel", () => {
  it("rechnet alle Münzen in Kupfer um", () => {
    expect(totalCopper({ cp: 5, sp: 3, ep: 1, gp: 2, pp: 1 })).toBe(
      5 + 30 + 50 + 200 + 1000,
    );
  });

  it("gibt den Goldwert mit zwei Nachkommastellen", () => {
    expect(copperToGold(1285)).toBe(12.85);
  });
});
