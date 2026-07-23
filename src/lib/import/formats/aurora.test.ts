import { describe, expect, it } from "vitest";

import { detectFormat, parseSheet } from "@/lib/import/parseSheet";
import type { FieldMap } from "@/lib/import/types";
import erisFields from "@/test/fixtures/eris-sheet-fields.json";

/**
 * Getestet gegen die Feldwerte eines echten, ausgefüllten Aurora-Bogens
 * (Eris Morn, Wizard 5, School of Necromancy). Die Fixture liegt im Repo,
 * damit die Tests nicht von einer Datei außerhalb des Projekts abhängen.
 */

const eris = () => parseSheet(erisFields as FieldMap);

/** Kleinstmöglicher Bogen, der noch als Aurora-Format erkannt wird. */
const minimal = (extra: FieldMap = {}): FieldMap => ({
  details_character_name: "Test",
  details_build: "",
  ...extra,
});

describe("Formaterkennung", () => {
  it("erkennt den Aurora-Bogen", () => {
    expect(detectFormat(erisFields as FieldMap)).toBe("aurora");
    expect(eris().format).toBe("aurora");
  });

  it("greift nur, wenn beide Kennfelder da sind", () => {
    expect(detectFormat({ details_build: "Level 1 Elf Wizard" })).toBeNull();
  });
});

describe("Grunddaten", () => {
  it("liest Name, Hintergrund und XP", () => {
    expect(eris()).toMatchObject({
      name: "Eris Morn",
      background: "Haunted One",
      xp: 6500,
    });
  });
});

describe("Attribute", () => {
  it("liest den echten Wert aus dem _modifier-Feld, nicht den Modifikator", () => {
    // Der Bogen vertauscht die beiden Felder: unter _score steht der
    // Modifikator, der eigentliche Wert unter _modifier.
    expect(eris().scores).toEqual({
      str: 8,
      dex: 14,
      con: 14,
      int: 20,
      wis: 12,
      cha: 8,
    });
  });

  it("setzt fehlende Werte auf 10 und meldet das", () => {
    const result = parseSheet(minimal());
    expect(result.scores.int).toBe(10);
    expect(result.warnings.some((w) => w.includes("INT"))).toBe(true);
  });
});

describe("Proficiencies", () => {
  it("erkennt die geübten Rettungswürfe", () => {
    const { saves } = eris();
    expect(saves.int).toBe(1);
    expect(saves.wis).toBe(1);
    expect(saves.str).toBe(0);
    expect(saves.cha).toBe(0);
  });

  it("erkennt die geübten Fertigkeiten", () => {
    const proficient = Object.entries(eris().skills)
      .filter(([, level]) => level > 0)
      .map(([key]) => key)
      .sort();
    expect(proficient).toEqual([
      "arcana",
      "investigation",
      "religion",
      "survival",
    ]);
  });

  it("übersetzt mehrteilige Fertigkeitsnamen richtig", () => {
    const result = parseSheet(
      minimal({
        details_animalhandling_proficiency: true,
        details_sleightofhand_expertise: true,
        details_sleightofhand_proficiency: true,
      }),
    );
    expect(result.skills["animal-handling"]).toBe(1);
    expect(result.skills["sleight-of-hand"]).toBe(2);
  });
});

describe("Klasse und Rasse aus details_build", () => {
  it("zerlegt Level, Rasse, Klasse und Subklasse", () => {
    const result = eris();
    expect(result.race).toBe("Custom Lineage");
    expect(result.classes).toEqual([
      {
        classKey: "wizard",
        rawName: "Wizard",
        level: 5,
        subclass: "School of Necromancy",
        hitDie: 6,
        known: true,
      },
    ]);
  });

  it("nimmt das rechte Klassenwort, nicht ein Wort aus dem Rassennamen", () => {
    const result = parseSheet(
      minimal({ details_build: "Level 3 Hill Dwarf Fighter, Champion" }),
    );
    expect(result.race).toBe("Hill Dwarf");
    expect(result.classes[0]).toMatchObject({
      classKey: "fighter",
      level: 3,
      subclass: "Champion",
    });
  });

  it("meldet eine unbekannte Klasse, statt sie zu raten", () => {
    const result = parseSheet(
      minimal({ details_build: "Level 4 Human Blood Hunter" }),
    );
    expect(result.classes[0]).toMatchObject({ classKey: "", known: false });
    expect(result.warnings.some((w) => w.includes("Blood Hunter"))).toBe(true);
  });

  it("meldet einen Bogen ganz ohne Klasse", () => {
    const result = parseSheet(minimal());
    expect(result.classes).toEqual([]);
    expect(result.warnings.some((w) => w.includes("keine Klasse"))).toBe(true);
  });

  it("leitet die Trefferwürfel nicht neu her, wenn der Bogen sie nennt", () => {
    // details_hd steht als „5d6“ im Bogen — kein Hinweis nötig.
    expect(
      eris().warnings.some((w) => w.includes("Trefferwürfel")),
    ).toBe(false);
  });
});

describe("Kampfwerte", () => {
  it("liest AC, Initiative und Bewegungsrate ohne Einheit", () => {
    const result = eris();
    expect(result.acOverride).toBe(12);
    expect(result.initiativeOverride).toBe(2);
    expect(result.speed).toBe(30);
  });

  it("übernimmt passive Wahrnehmung sowie Zauber-DC und -Angriff", () => {
    const result = eris();
    expect(result.passivePerceptionOverride).toBe(11);
    expect(result.spellSaveDcOverride).toBe(16);
    expect(result.spellAttackOverride).toBe(8);
  });

  it("liest die maximalen Trefferpunkte und meldet fehlende aktuelle", () => {
    const result = eris();
    expect(result.hpMaxOverride).toBe(32);
    expect(result.hpCurrent).toBeNull();
    expect(result.warnings.some((w) => w.includes("vollen HP"))).toBe(true);
  });
});

describe("Zauber", () => {
  it("sammelt Cantrips und Zauber aller Grade", () => {
    const spells = eris().spells;
    expect(spells).toContainEqual({ name: "Chill Touch", level: 0 });
    expect(spells).toContainEqual({ name: "Magic Missile", level: 1 });
    expect(spells).toContainEqual({ name: "Counterspell", level: 3 });
    expect(spells).toHaveLength(20);
  });

  it("nimmt auch die „Other Spells“ mit und schneidet die Quellenangabe ab", () => {
    const spells = eris().spells;
    // „Inflict Wounds (Shadow Touched)“ → Name ohne Klammerzusatz.
    expect(spells).toContainEqual({ name: "Inflict Wounds", level: 1 });
    expect(spells).toContainEqual({ name: "Invisibility", level: 2 });
  });
});

describe("Angriffe", () => {
  it("meldet einen Bogen ganz ohne Waffe", () => {
    expect(eris().attacks).toHaveLength(0);
    expect(eris().warnings.some((w) => w.includes("keine Waffe"))).toBe(true);
  });

  it("liest eingetragene Waffen mit Bonus, Schaden und Reichweite", () => {
    const result = parseSheet(
      minimal({
        details_build: "Level 1 Human Fighter",
        details_attack1_weapon: "Longsword",
        details_attack1_attack: "+5",
        details_attack1_damage: "1d8+3 slashing",
        details_attack1_range: "5 ft.",
      }),
    );
    expect(result.attacks[0]).toMatchObject({
      name: "Longsword",
      attackBonus: 5,
      damage: "1d8+3 slashing",
      range: "5 ft.",
    });
  });
});

describe("Ausrüstung", () => {
  it("liest die magischen Gegenstände mit Art und Quelle als Beschreibung", () => {
    const amulet = eris().items.find((i) => i.name.startsWith("Amulet"));
    expect(amulet).toBeDefined();
    expect(amulet!.description).toContain("Wondrous Items");
    expect(amulet!.description).toContain("Tasha");
  });

  it("liest den Geldbeutel als Nullen", () => {
    expect(eris().currency).toEqual({ cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 });
  });
});

describe("Notizen", () => {
  it("sammelt die Merkmale samt Hintergrundmerkmal als Fähigkeiten", () => {
    const names = eris().features.map((f) => f.name);
    expect(names).toContain("Arcane Recovery");
    expect(names).toContain("Grim Harvest");
    expect(names).toContain("Heart of Darkness");
  });

  it("hält das Äußere fest, soweit der Bogen etwas hergibt", () => {
    const looks = eris().notes.find((n) => n.title === "Äußeres");
    expect(looks!.body).toContain("Geschlecht: Female");
  });

  it("übernimmt die Hintergrundgeschichte", () => {
    expect(eris().backstory).toContain("haunted by something");
  });
});
