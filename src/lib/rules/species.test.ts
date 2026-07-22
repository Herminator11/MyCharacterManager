import { describe, expect, it } from "vitest";

import type { AbilityScores } from "./derive";
import {
  bonusEntries,
  bonusSummary,
  modifierChanges,
  normalizeSpeciesName,
  withoutSpeciesBonuses,
  withSpeciesBonuses,
  type SpeciesDef,
} from "./species";

const scores: AbilityScores = {
  str: 10,
  dex: 14,
  con: 12,
  int: 13,
  wis: 8,
  cha: 15,
};

const tiefling: Pick<SpeciesDef, "abilityBonuses"> = {
  abilityBonuses: { int: 1, cha: 2 },
};

describe("Boni anzeigen", () => {
  it("führt sie in Bogenreihenfolge, nicht in Eingabereihenfolge", () => {
    expect(bonusEntries(tiefling)).toEqual([
      { ability: "int", bonus: 1 },
      { ability: "cha", bonus: 2 },
    ]);
  });

  it("überspringt Attribute ohne Bonus", () => {
    expect(bonusEntries({ abilityBonuses: {} })).toEqual([]);
  });

  it("schreibt die Zusammenfassung mit Vorzeichen", () => {
    expect(bonusSummary(tiefling)).toBe("+1 INT · +2 CHA");
  });
});

describe("Boni übernehmen", () => {
  it("addiert auf die Endwerte und lässt den Rest in Ruhe", () => {
    const after = withSpeciesBonuses(scores, tiefling);

    expect(after.int).toBe(14);
    expect(after.cha).toBe(17);
    expect(after.str).toBe(10);
    expect(after.dex).toBe(14);
  });

  it("fasst die übergebenen Werte nicht an", () => {
    withSpeciesBonuses(scores, tiefling);
    expect(scores.cha).toBe(15);
  });

  it("klemmt nicht bei 20 — das Maximum gilt für Verbesserungen, nicht hier", () => {
    const high = { ...scores, cha: 19 };
    expect(withSpeciesBonuses(high, tiefling).cha).toBe(21);
  });

  it("verrechnet die sechs Boni des Menschen", () => {
    const human = {
      abilityBonuses: { str: 1, dex: 1, con: 1, int: 1, wis: 1, cha: 1 },
    };
    expect(withSpeciesBonuses(scores, human)).toEqual({
      str: 11,
      dex: 15,
      con: 13,
      int: 14,
      wis: 9,
      cha: 16,
    });
  });
});

describe("Boni zurücknehmen", () => {
  it("stellt den Ausgangszustand wieder her", () => {
    const applied = withSpeciesBonuses(scores, tiefling);
    expect(withoutSpeciesBonuses(applied, tiefling)).toEqual(scores);
  });

  it("zieht auch dann ab, wenn zwischendurch von Hand geändert wurde", () => {
    // Der Spieler hebt CHA nach dem Übernehmen noch einmal um 2 an. Das
    // Rückgängig darf davon nichts verschlucken — es nimmt nur zurück, was
    // die App selbst addiert hat.
    const applied = withSpeciesBonuses(scores, tiefling);
    const edited = { ...applied, cha: applied.cha + 2 };

    expect(withoutSpeciesBonuses(edited, tiefling).cha).toBe(scores.cha + 2);
  });
});

describe("Was sich am Tisch wirklich ändert", () => {
  it("nennt nur Attribute, deren Modifikator springt", () => {
    // INT 12 → 13 bleibt bei +1: ein gerader Wert schluckt den einzelnen
    // Punkt. CHA 15 → 17 hebt den Modifikator dagegen von +2 auf +3.
    const even = { ...scores, int: 12 };

    expect(modifierChanges(even, tiefling)).toEqual([
      { ability: "cha", from: 2, to: 3 },
    ]);
  });

  it("nennt beide, wenn beide springen", () => {
    // INT 13 ist ungerade — hier reicht der eine Punkt.
    expect(modifierChanges(scores, tiefling)).toEqual([
      { ability: "int", from: 1, to: 2 },
      { ability: "cha", from: 2, to: 3 },
    ]);
  });

  it("schweigt, wenn sich kein Modifikator bewegt", () => {
    const even = { ...scores, cha: 14, int: 12 };
    expect(modifierChanges(even, { abilityBonuses: { cha: 1, int: 1 } })).toEqual(
      [],
    );
  });
});

describe("Namen aus dem PDF zuordnen", () => {
  it("trifft dieselbe Spezies trotz Schreibweise", () => {
    const target = normalizeSpeciesName("Half-Elf");

    expect(normalizeSpeciesName("half elf")).toBe(target);
    expect(normalizeSpeciesName("HALFELF")).toBe(target);
    expect(normalizeSpeciesName(" Half-Elf ")).toBe(target);
  });

  it("wirft Akzente weg statt an ihnen zu scheitern", () => {
    expect(normalizeSpeciesName("Drów")).toBe("drow");
  });

  it("hält Verschiedenes auseinander", () => {
    expect(normalizeSpeciesName("Hill Dwarf")).not.toBe(
      normalizeSpeciesName("Dwarf"),
    );
  });
});
