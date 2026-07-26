import { describe, expect, it } from "vitest";

import kaelFields from "@/test/fixtures/kael-sheet-fields.json";

import { parseSheet } from "@/lib/import/parseSheet";
import type { FieldMap } from "@/lib/import/types";

/**
 * Getestet gegen die Feldwerte eines echten, ausgefüllten Bogens
 * (Kael, Sorcerer 5 / Warlock 5). Die Fixture liegt im Repo, damit die
 * Tests nicht von einer Datei außerhalb des Projekts abhängen.
 */

const kael = () => parseSheet(kaelFields as FieldMap);

describe("Grunddaten", () => {
  it("liest Name, Rasse, Hintergrund und Gesinnung", () => {
    expect(kael()).toMatchObject({
      name: "Kael",
      race: "Mensch",
      background: "Akolyt",
      alignment: "Chaotic Neutral",
    });
  });

  it("erkennt gesetzte Inspiration", () => {
    // Der Bogen trägt dort ein "*" ein, kein Häkchen.
    expect(kael().inspiration).toBe(true);
  });
});

describe("Attribute", () => {
  it("liest alle sechs Werte", () => {
    expect(kael().scores).toEqual({
      str: 8,
      dex: 13,
      con: 11,
      int: 16,
      wis: 11,
      cha: 20,
    });
  });

  it("setzt fehlende Werte auf 10 und meldet das", () => {
    const result = parseSheet({ "Front_Character Name": "Leer", "Front_Class Name": "" });
    expect(result.scores.str).toBe(10);
    expect(result.warnings.some((w) => w.includes("STR"))).toBe(true);
  });
});

describe("Proficiencies", () => {
  it("erkennt die geübten Rettungswürfe", () => {
    const { saves } = kael();
    expect(saves.con).toBe(1);
    expect(saves.cha).toBe(1);
    expect(saves.str).toBe(0);
    expect(saves.dex).toBe(0);
    expect(saves.int).toBe(0);
    expect(saves.wis).toBe(0);
  });

  it("erkennt die geübten Fertigkeiten", () => {
    const { skills } = kael();
    const proficient = Object.entries(skills)
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

  it("übersetzt Fertigkeiten mit mehreren Wörtern richtig", () => {
    // "Front_Proficiency Sleight of Hand" → Schlüssel "sleight-of-hand"
    expect(kael().skills["sleight-of-hand"]).toBe(1);
    expect(kael().skills["animal-handling"]).toBe(0);
  });

  it("unterscheidet Expertise von einfacher Übung", () => {
    const result = parseSheet({
      "Front_Character Name": "Test",
      "Front_Class Name": "Rogue",
      "Front_Proficiency Stealth": true,
      "Front_Expertise Stealth": true,
      "Front_Proficiency Arcana": true,
    });
    expect(result.skills.stealth).toBe(2);
    expect(result.skills.arcana).toBe(1);
  });
});

describe("Klassen", () => {
  it("zerlegt „Sorcerer / Warlock“ in zwei Klassen mit ihren Leveln", () => {
    expect(kael().classes).toEqual([
      {
        classKey: "sorcerer",
        rawName: "Sorcerer",
        level: 5,
        subclass: "Shadow Magic",
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

  it("leitet die Trefferwürfel aus den Klassen ab, weil der Bogen sie leer lässt", () => {
    // Sorcerer d6, Warlock d8 — für die kurze Rast unverzichtbar.
    expect(kael().classes.map((c) => `${c.level}d${c.hitDie}`)).toEqual([
      "5d6",
      "5d8",
    ]);
    expect(
      kael().warnings.some((w) => w.includes("5d6 + 5d8")),
    ).toBe(true);
  });

  it("versteht deutsche Klassennamen", () => {
    const result = parseSheet({
      "Front_Character Name": "Test",
      "Front_Class Name": "Hexenmeister / Zauberer",
      "Front_Level 1": "3",
      "Front_Level 2": "2",
    });
    expect(result.classes.map((c) => c.classKey)).toEqual([
      "warlock",
      "sorcerer",
    ]);
  });

  it("meldet unbekannte Klassen, statt sie zu raten", () => {
    const result = parseSheet({
      "Front_Character Name": "Test",
      "Front_Class Name": "Blood Hunter",
      "Front_Level 1": "4",
    });
    expect(result.classes[0]).toMatchObject({
      classKey: "",
      rawName: "Blood Hunter",
      known: false,
    });
    expect(result.warnings.some((w) => w.includes("Blood Hunter"))).toBe(true);
  });

  it("meldet einen Bogen ganz ohne Klasse", () => {
    const result = parseSheet({ "Front_Character Name": "Namenlos", "Front_Class Name": "" });
    expect(result.classes).toEqual([]);
    expect(result.warnings.some((w) => w.includes("keine Klasse"))).toBe(true);
  });
});

describe("Kampfwerte", () => {
  it("liest AC, Initiative und Bewegungsrate", () => {
    const result = kael();
    expect(result.acOverride).toBe(14);
    expect(result.initiativeOverride).toBe(1);
    // Im Bogen steht "30ft." — die Einheit muss weg.
    expect(result.speed).toBe(30);
  });

  it("übernimmt Zauber-DC und -Angriff als Override", () => {
    const result = kael();
    // Aus CHA 20 (+5) und Proficiency +4 ergäben sich 17 und +9.
    // Der Bogen nennt 19 und +11 — die Differenz kommt vom Blood Vial +2.
    expect(result.spellSaveDcOverride).toBe(19);
    expect(result.spellAttackOverride).toBe(11);
  });

  it("liest die maximalen Trefferpunkte und meldet fehlende aktuelle", () => {
    const result = kael();
    expect(result.hpMaxOverride).toBe(46);
    expect(result.hpCurrent).toBeNull();
    expect(result.warnings.some((w) => w.includes("vollen HP"))).toBe(true);
  });
});

describe("Angriffe", () => {
  it("übernimmt den Zauberangriff samt Wirkung und Reichweite", () => {
    const attacks = kael().attacks;
    expect(attacks).toHaveLength(1);
    expect(attacks[0]).toMatchObject({
      name: "Eldritch Blast",
      attackBonus: 11,
      damage: "2d10 +5 force damage per beam",
      range: "120 ft",
    });
    expect(attacks[0].notes).toContain("1 action");
  });

  it("liest Waffen, wenn welche eingetragen sind", () => {
    const result = parseSheet({
      "Front_Character Name": "Test",
      "Front_Class Name": "Rogue",
      "Front_Weapon Name 1": "Dagger",
      "Front_Weapon Atk Bonus 1": "+5",
      "Front_Weapon Damage 1": "1d4+1 piercing",
    });
    expect(result.attacks[0]).toMatchObject({
      name: "Dagger",
      attackBonus: 5,
      damage: "1d4+1 piercing",
    });
  });

  it("meldet einen Bogen ganz ohne Angriffe", () => {
    const result = parseSheet({ "Front_Character Name": "Leer", "Front_Class Name": "" });
    expect(result.warnings.some((w) => w.includes("keine Waffe"))).toBe(true);
  });
});

describe("Ressourcen", () => {
  it("liest die Hauptressource", () => {
    expect(kael().resources).toContainEqual({
      name: "Sorcery Points",
      total: 5,
      used: 0,
    });
  });

  it("ignoriert leere Zusatzzähler", () => {
    // Der Bogen hat dort nur Leerzeichen stehen.
    expect(kael().resources).toHaveLength(1);
  });
});

describe("Notizen", () => {
  it("sammelt die Klassenfeatures als Fähigkeiten", () => {
    const names = kael().features.map((f) => f.name);
    expect(names.some((n) => n.includes("EYES OF THE DARK"))).toBe(true);
    expect(names.some((n) => n.includes("HOUND OF ILL OMEN"))).toBe(true);
  });

  it("lässt die Platzhalterzeilen „FEATURE“ weg", () => {
    const names = kael().features.map((f) => f.name);
    expect(names).not.toContain("FEATURE");
  });

  it("wandelt die Wagenrückläufe des PDFs in Zeilenumbrüche", () => {
    expect(kael().features.some((f) => f.description.includes("\r"))).toBe(
      false,
    );
  });

  it("sammelt Sprachen und Merkmale", () => {
    const traits = kael().features.find((f) => f.name === "Merkmale & Sprachen");
    expect(traits!.description).toContain("Common, Abyssal, Infernal, Primordial");
    expect(traits!.description).toContain("Superior Darkvision");
  });
});

describe("Ausrüstung", () => {
  it("liest benannte Gegenstände mit ihrer Wirkung", () => {
    const items = kael().items;
    const vial = items.find((i) => i.name === "Blood Vial +2");
    expect(vial).toBeDefined();
    expect(vial!.description).toContain("spellcasting focus");
  });

  it("zerlegt den Rucksack in einzelne Einträge", () => {
    const names = kael().items.map((i) => i.name);
    expect(names).toContain("1 Small Healing Potion");
    expect(names).toContain("Mage Armor Scroll");
  });

  it("liest den Geldbeutel als Nullen, wenn nichts eingetragen ist", () => {
    expect(kael().currency).toEqual({ cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 });
  });
});

describe("Zauberplätze", () => {
  it("übernimmt keinen Verbrauch, sondern meldet ihn", () => {
    const result = parseSheet({
      "Front_Character Name": "Test",
      "Front_Class Name": "Wizard",
      "Front_Spell Slot 1st 1": true,
      "Front_Spell Slot 1st 2": true,
    });
    expect(result.warnings.some((w) => w.includes("2 Zauberplätze"))).toBe(true);
  });

  it("schweigt, wenn nichts angekreuzt ist", () => {
    expect(
      kael().warnings.some((w) => w.includes("Zauberplätze als verbraucht")),
    ).toBe(false);
  });
});
