import { describe, expect, it } from "vitest";

import { germanWarnings } from "@/test/warnings";

import { parseSheet, detectFormat } from "@/lib/import/parseSheet";
import type { FieldMap } from "@/lib/import/types";
import { SKILLS } from "@/lib/rules/skills";
import officialFields from "@/test/fixtures/official-sheet-fields.json";

/**
 * Getestet gegen einen echten offiziellen Bogen von Wizards of the Coast,
 * ausgefüllt mit einem Testcharakter. Das ist das Format, das Aurora und
 * die meisten anderen Generatoren ausgeben.
 */

const sheet = () => parseSheet(officialFields as FieldMap);

describe("Formaterkennung", () => {
  it("erkennt den offiziellen Bogen", () => {
    expect(detectFormat(officialFields as FieldMap)).toBe("official");
    expect(sheet().format).toBe("official");
  });

  it("weist ein PDF ohne bekannte Felder ab, statt zu raten", () => {
    // Der Fehler trägt die Feldzahl; den Satz dazu bildet die Server
    // Action in der Sprache des Geräts.
    expect(() => parseSheet({ Vorname: "Test", Nachname: "Fall" })).toThrow(
      expect.objectContaining({ fieldCount: 2 }),
    );
  });
});

describe("Grunddaten", () => {
  it("liest Name, Rasse, Hintergrund und Gesinnung", () => {
    expect(sheet()).toMatchObject({
      name: "Aurora Testfall",
      race: "Half-Elf",
      background: "Sage",
      alignment: "Chaotic Good",
      xp: 64000,
      inspiration: true,
    });
  });
});

describe("Klassen aus dem kombinierten Feld", () => {
  it("zerlegt „Sorcerer 5 / Warlock 5“ in zwei Klassen", () => {
    expect(sheet().classes).toEqual([
      {
        classKey: "sorcerer",
        rawName: "Sorcerer",
        level: 5,
        subclass: "",
        hitDie: 6,
        known: true,
      },
      {
        classKey: "warlock",
        rawName: "Warlock",
        level: 5,
        subclass: "",
        hitDie: 8,
        known: true,
      },
    ]);
  });

  it("kommt auch mit anderen Schreibweisen zurecht", () => {
    const variants: Record<string, [string, number][]> = {
      "Wizard 10": [["wizard", 10]],
      "Fighter 3, Rogue 2": [
        ["fighter", 3],
        ["rogue", 2],
      ],
      "Paladin 6 / Warlock 4": [
        ["paladin", 6],
        ["warlock", 4],
      ],
      "Barde 4 und Schurke 1": [
        ["bard", 4],
        ["rogue", 1],
      ],
    };

    for (const [input, expected] of Object.entries(variants)) {
      const result = parseSheet({
        ClassLevel: input,
        ProfBonus: "+2",
        "Check Box 11": false,
      });
      expect(
        result.classes.map((c) => [c.classKey, c.level]),
        `„${input}“`,
      ).toEqual(expected);
    }
  });
});

describe("Attribute und Proficiencies", () => {
  it("liest alle sechs Attributwerte", () => {
    expect(sheet().scores).toEqual({
      str: 8,
      dex: 13,
      con: 11,
      int: 16,
      wis: 11,
      cha: 20,
    });
  });

  it("ordnet die namenlosen Kästchen den richtigen Rettungswürfen zu", () => {
    // Angekreuzt waren Check Box 19 (CON) und 22 (CHA).
    const { saves } = sheet();
    expect(saves).toEqual({
      str: 0,
      dex: 0,
      con: 1,
      int: 0,
      wis: 0,
      cha: 1,
    });
  });

  it("ordnet die namenlosen Kästchen den richtigen Fertigkeiten zu", () => {
    // Angekreuzt waren 25, 27, 29, 36, 37, 38.
    const proficient = Object.entries(sheet().skills)
      .filter(([, level]) => level > 0)
      .map(([key]) => key)
      .sort();

    expect(proficient).toEqual([
      "arcana",
      "deception",
      "insight",
      "persuasion",
      "religion",
      "sleight-of-hand",
    ]);
  });

  it("deckt mit „Check Box 23“ bis „Check Box 40“ genau alle 18 Fertigkeiten ab", () => {
    // Sicherung gegen einen Versatz um eins: jede einzeln ankreuzen und
    // prüfen, dass genau die erwartete Fertigkeit anspringt.
    SKILLS.forEach((skill, index) => {
      const result = parseSheet({
        ClassLevel: "Wizard 1",
        ProfBonus: "+2",
        "Check Box 11": false,
        [`Check Box ${23 + index}`]: true,
      });
      const hit = Object.entries(result.skills)
        .filter(([, level]) => level > 0)
        .map(([key]) => key);
      expect(hit, `Check Box ${23 + index}`).toEqual([skill.key]);
    });
  });
});

describe("Kampfwerte", () => {
  it("liest AC, Initiative, Bewegungsrate und Trefferpunkte", () => {
    const result = sheet();
    expect(result.acOverride).toBe(14);
    expect(result.initiativeOverride).toBe(1);
    expect(result.speed).toBe(30); // aus "30 ft."
    expect(result.hpMaxOverride).toBe(46);
    expect(result.hpCurrent).toBe(31);
    expect(result.hpTemp).toBe(5);
  });

  it("liest Zauber-DC und -Angriff aus dem Feld mit den zwei Leerzeichen", () => {
    // Das Originalfeld heißt "SpellSaveDC  2" — ein bekannter Schönheits-
    // fehler des offiziellen Bogens.
    expect(sheet().spellSaveDcOverride).toBe(19);
    expect(sheet().spellAttackOverride).toBe(11);
  });

  it("liest die Waffen, auch die mit Leerzeichen im Feldnamen", () => {
    // "Wpn2 AtkBonus " und "Wpn3 AtkBonus  " tragen im Original ein bzw.
    // zwei nachgestellte Leerzeichen — ein Klassiker dieses Bogens.
    expect(sheet().attacks).toEqual([
      {
        name: "Dagger",
        attackBonus: 5,
        damage: "1d4+1 piercing",
        range: "",
        notes: "",
      },
      {
        name: "Quarterstaff",
        attackBonus: 2,
        damage: "1d6-1 bludgeoning",
        range: "",
        notes: "",
      },
    ]);
  });
});

describe("Zauber", () => {
  it("ordnet jeden Zauber seinem Grad zu", () => {
    const spells = sheet().spells;
    const byName = Object.fromEntries(spells.map((s) => [s.name, s.level]));

    expect(byName["Eldritch Blast"]).toBe(0);
    expect(byName["Prestidigitation"]).toBe(0);
    expect(byName["Shield"]).toBe(1);
    expect(byName["Hex"]).toBe(1);
    expect(byName["Misty Step"]).toBe(2);
    expect(byName["Counterspell"]).toBe(3);
  });

  it("übernimmt keine leeren Zeilen", () => {
    expect(sheet().spells).toHaveLength(6);
  });
});

describe("Ausrüstung und Notizen", () => {
  it("zerlegt die Ausrüstungsliste zeilenweise", () => {
    const names = sheet().items.map((i) => i.name);
    expect(names).toEqual([
      "Blood Vial +2",
      "Healing Potion",
      "Rope (50 ft)",
    ]);
  });

  it("liest den Geldbeutel", () => {
    expect(sheet().currency).toEqual({
      cp: 12,
      sp: 5,
      ep: 0,
      gp: 230,
      pp: 2,
    });
  });

  it("übernimmt die Charakterzüge", () => {
    expect(sheet()).toMatchObject({
      personality: "Spricht wenig, beobachtet viel.",
      ideals: "Wissen über alles.",
      bonds: "Meine alte Lehrmeisterin.",
      flaws: "Ich traue niemandem ganz.",
      backstory: "In einem Kloster aufgewachsen.",
    });
  });

  it("legt Sprachen und Merkmale als Fähigkeiten an", () => {
    const titles = sheet().features.map((f) => f.name);
    expect(titles).toContain("Übungen & Sprachen");
    expect(titles).toContain("Merkmale & Fähigkeiten");
  });
});

describe("Hinweise", () => {
  it("meldet, dass der offizielle Bogen keine Expertise kennt", () => {
    const result = parseSheet({
      ClassLevel: "Rogue 5",
      ProfBonus: "+3",
      "Check Box 11": false,
    });
    expect(germanWarnings(result).some((w) => w.includes("Expertise"))).toBe(true);
  });

  it("schweigt zur Expertise bei Klassen, die keine bekommen", () => {
    const result = parseSheet({
      ClassLevel: "Fighter 5",
      ProfBonus: "+3",
      "Check Box 11": false,
    });
    expect(germanWarnings(result).some((w) => w.includes("Expertise"))).toBe(false);
  });

  it("meldet angekreuzte Death Saves, statt sie zu übernehmen", () => {
    const result = parseSheet({
      ClassLevel: "Wizard 3",
      ProfBonus: "+2",
      "Check Box 11": false,
      "Check Box 12": true,
      "Check Box 15": true,
      "Check Box 16": true,
    });
    expect(
      germanWarnings(result).some((w) => w.includes("1 Erfolge, 2 Fehlschläge")),
    ).toBe(true);
  });

  it("leitet die Trefferwürfel ab, wenn das Feld leer ist", () => {
    const result = parseSheet({
      ClassLevel: "Sorcerer 5 / Warlock 5",
      ProfBonus: "+4",
      "Check Box 11": false,
    });
    expect(germanWarnings(result).some((w) => w.includes("5d6 + 5d8"))).toBe(true);
  });
});
