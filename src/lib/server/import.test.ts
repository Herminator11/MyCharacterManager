import { beforeEach, describe, expect, it } from "vitest";

import { parseSheet } from "@/lib/import/parseSheet";
import type { FieldMap } from "@/lib/import/types";
import kaelFields from "@/test/fixtures/kael-sheet-fields.json";
import officialFields from "@/test/fixtures/official-sheet-fields.json";

import {
  deleteCharacter,
  getCharacterSpells,
  getAttacks,
  getFeatures,
  getInventory,
  getLiveState,
  getSheet,
  listCharacters,
} from "./characters";
import { importCharacter } from "./import";
import {
  createCustomSpell,
  removeSpellFromCharacter,
  searchCatalog,
} from "./spells";

/**
 * Der ganze Weg: Feldwerte aus Kaels Bogen → Entwurf → Charakter in der
 * Datenbank. Prüft, dass die abgeleiteten Regeln nach dem Import greifen.
 */

let id: number;

beforeEach(() => {
  for (const character of listCharacters()) deleteCharacter(character.id);
  id = importCharacter(parseSheet(kaelFields as FieldMap));
});

describe("Charakter", () => {
  it("übernimmt Grunddaten und Attribute", () => {
    const sheet = getSheet(id)!;
    expect(sheet.character.name).toBe("Kael");
    expect(sheet.character.race).toBe("Mensch");
    expect(sheet.scores.cha).toBe(20);
  });

  it("markiert den Charakter als aus dem PDF importiert", () => {
    // Grundlage für die Sperre am "Boni übernehmen"-Knopf: die Attribute
    // oben sind bereits Endwerte, Rassenboni fast immer schon eingerechnet.
    const sheet = getSheet(id)!;
    expect(sheet.character.importedFromPdf).toBe(true);
  });

  it("legt beide Klassen mit Unterklasse an", () => {
    const sheet = getSheet(id)!;
    expect(
      sheet.classes.map((c) => `${c.classKey} ${c.level}`),
    ).toEqual(["sorcerer 5", "warlock 5"]);
    expect(sheet.classes[0].subclass).toBe("Shadow Magic");
  });

  it("kommt auf Gesamtlevel 10 und Proficiency +4", () => {
    const sheet = getSheet(id)!;
    expect(sheet.level).toBe(10);
    // Der Bogen nennt ebenfalls +4 — unsere Rechnung stimmt mit ihm überein.
    expect(sheet.proficiencyBonus).toBe(4);
  });

  it("übernimmt die Proficiencies aus dem Bogen", () => {
    const sheet = getSheet(id)!;

    const conSave = sheet.abilities.find((a) => a.key === "con")!;
    expect(conSave.proficient).toBe(true);
    expect(conSave.save).toBe(4); // CON +0, Proficiency +4

    const arcana = sheet.skills.find((s) => s.key === "arcana")!;
    expect(arcana.level).toBe(1);
    expect(arcana.bonus).toBe(7); // INT +3, Proficiency +4
  });

  it("rechnet dieselben Fertigkeitsboni wie der Bogen", () => {
    const sheet = getSheet(id)!;
    const bonus = (key: string) =>
      sheet.skills.find((s) => s.key === key)!.bonus;

    expect(bonus("sleight-of-hand")).toBe(5);
    expect(bonus("religion")).toBe(7);
    expect(bonus("insight")).toBe(4);
    expect(bonus("deception")).toBe(9);
    expect(bonus("persuasion")).toBe(9);
    expect(bonus("athletics")).toBe(-1);
  });
});

describe("Abgeleitete Werte", () => {
  it("nimmt AC und Initiative aus dem Bogen statt sie zu berechnen", () => {
    const sheet = getSheet(id)!;
    // Berechnet wären 10 + DEX 1 = 11; der Bogen nennt 14 (Mage Armor o.ä.).
    expect(sheet.armorClass).toBe(14);
    expect(sheet.initiative).toBe(1);
  });

  it("übernimmt Zauber-DC und -Angriff mitsamt Item-Bonus", () => {
    const sheet = getSheet(id)!;
    // Ohne Blood Vial +2 wären es 17 und +9.
    expect(sheet.spellcasting?.saveDc).toBe(19);
    expect(sheet.spellcasting?.attackBonus).toBe(11);
  });

  it("startet mit den vollen Trefferpunkten des Bogens", () => {
    const live = getLiveState(id)!;
    expect(live.hpMax).toBe(46);
    expect(live.hpCurrent).toBe(46);
  });

  it("leitet die Trefferwürfel aus den Klassen ab", () => {
    const live = getLiveState(id)!;
    expect(
      live.hitDice.map((h) => `${h.total}d${h.hitDie}`).sort(),
    ).toEqual(["5d6", "5d8"]);
  });
});

describe("Zauberplätze", () => {
  it("gibt Sorcerer 5 / Warlock 5 zwei getrennte Pools", () => {
    const live = getLiveState(id)!;
    expect(live.pools.map((p) => p.name)).toEqual([
      "Zauberplätze",
      "Pact Magic",
    ]);
  });

  it("rechnet den gemeinsamen Pool nach der Multiclass-Regel", () => {
    const live = getLiveState(id)!;
    // Warlock zählt nicht mit → Caster-Level 5 → 4/3/2
    const pool = live.pools.find((p) => p.name === "Zauberplätze")!;
    expect(pool.slots.map((s) => s.total)).toEqual([4, 3, 2]);
  });

  it("gibt Pact Magic zwei Plätze vom Grad 3", () => {
    const live = getLiveState(id)!;
    const pact = live.pools.find((p) => p.name === "Pact Magic")!;
    expect(pact.slots).toEqual([{ level: 3, total: 2, used: 0 }]);
    expect(pact.recovery).toBe("short");
  });

  it("startet mit vollen Plätzen", () => {
    for (const pool of getLiveState(id)!.pools) {
      for (const slot of pool.slots) expect(slot.used).toBe(0);
    }
  });
});

describe("Ressourcen", () => {
  it("führt Sorcery Points genau einmal", () => {
    const sorcery = getLiveState(id)!.resources.filter(
      (r) => r.name.toLowerCase() === "sorcery points",
    );
    expect(sorcery).toHaveLength(1);
    // Aus der Klassenprogression, nicht abgeschrieben.
    expect(sorcery[0]).toMatchObject({ current: 5, max: 5, recovery: "long" });
  });
});

describe("Angriffe und Ausrüstung", () => {
  it("legt den Zauberangriff an", () => {
    const list = getAttacks(id);
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({
      name: "Eldritch Blast",
      attackBonusOverride: 11,
      range: "120 ft",
    });
  });

  it("lässt einen Schadenstext, der sich nicht sicher zerlegen lässt, stehen", () => {
    // "per beam" ist keine Schadensart. Bonus 0, damit die +5 im Text
    // nicht noch um den Attributsmodifikator ergänzt werden.
    expect(getAttacks(id)[0]).toMatchObject({
      damageDice: "2d10 +5 force damage per beam",
      damageBonusOverride: 0,
      damageType: "",
    });
  });

  it("übernimmt Gegenstände und Rucksackinhalt", () => {
    const names = getInventory(id).map((i) => i.name);
    expect(names).toContain("Blood Vial +2");
    expect(names).toContain("Mage Armor Scroll");
  });

  it("legt aus diesem Format keine Zauber an — es listet keine auf", () => {
    // Das Front_/Back_-Format hat keine Zauberfelder; der offizielle Bogen
    // schon, dafür gibt es eigene Tests.
    expect(getCharacterSpells(id)).toEqual([]);
  });
});

describe("Notizen", () => {
  it("legt Merkmale & Sprachen und Klassenfeatures als Fähigkeiten an", () => {
    expect(getFeatures(id).map((f) => f.title)).toContain("Merkmale & Sprachen");
    expect(getFeatures(id).length).toBeGreaterThan(0);
  });
});

describe("Robustheit", () => {
  it("importiert auch einen fast leeren Bogen", () => {
    const emptyId = importCharacter(
      parseSheet({ "Front_Character Name": "Namenlos", "Front_Class Name": "" }),
    );
    const sheet = getSheet(emptyId)!;
    expect(sheet.character.name).toBe("Namenlos");
    expect(sheet.classes).toEqual([]);
    expect(getLiveState(emptyId)!.pools).toEqual([]);
  });

  it("überspringt Klassen, die nicht zugeordnet werden konnten", () => {
    const draft = parseSheet({
      "Front_Character Name": "Test",
      "Front_Class Name": "Blood Hunter / Sorcerer",
      "Front_Level 1": "3",
      "Front_Level 2": "2",
    });
    const mixedId = importCharacter(draft);
    // Nur die erkannte Klasse landet in der Datenbank.
    expect(getSheet(mixedId)!.classes.map((c) => c.classKey)).toEqual([
      "sorcerer",
    ]);
  });
});

describe("Offizieller Bogen", () => {
  let officialId: number;

  beforeEach(() => {
    officialId = importCharacter(parseSheet(officialFields as FieldMap));
  });

  it("verknüpft bekannte Zauber mit dem SRD-Katalog", () => {
    const list = getCharacterSpells(officialId);
    const misty = list.find((e) => e.spell.name === "Misty Step");

    expect(misty).toBeDefined();
    // Aus dem Katalog, nicht neu angelegt — erkennbar am SRD-Index.
    expect(misty!.spell.source).toBe("srd");
    expect(misty!.spell.indexKey).toBe("misty-step");
    expect(misty!.spell.level).toBe(2);
    expect(misty!.entry.prepared).toBe(true);
  });

  it("übernimmt den Grad aus dem Katalog, nicht aus dem Bogen", () => {
    const list = getCharacterSpells(officialId);
    // Counterspell stand im Grad-3-Block; der Katalog bestätigt Grad 3.
    expect(
      list.find((e) => e.spell.name === "Counterspell")!.spell.level,
    ).toBe(3);
  });

  it("legt unbekannte Zauber selbst an, statt sie zu verlieren", () => {
    const draft = parseSheet(officialFields as FieldMap);
    draft.spells.push({ name: "Kaels Schattenfaust", level: 4 });

    const homebrewId = importCharacter(draft);
    const entry = getCharacterSpells(homebrewId).find(
      (e) => e.spell.name === "Kaels Schattenfaust",
    );

    expect(entry).toBeDefined();
    // 'imported', nicht 'custom': ein Nebenprodukt des Imports, das mit
    // seinem letzten Nutzer wieder verschwinden darf.
    expect(entry!.spell.source).toBe("imported");
    expect(entry!.spell.level).toBe(4);
  });

  it("zerlegt den Waffenschaden in Würfel, Bonus und Schadensart", () => {
    const list = getAttacks(officialId);
    expect(
      list.map((a) => [a.name, a.damageDice, a.damageBonusOverride, a.damageType]),
    ).toEqual([
      ["Dagger", "1d4", 1, "piercing"],
      ["Quarterstaff", "1d6", -1, "bludgeoning"],
    ]);
  });

  it("legt beide Zauberplatz-Pools an", () => {
    expect(getLiveState(officialId)!.pools.map((p) => p.name)).toEqual([
      "Zauberplätze",
      "Pact Magic",
    ]);
  });
});

/**
 * Der Import legt für unbekannte Namen Katalogeinträge an. Die dürfen nicht
 * liegenbleiben, wenn ihr Charakter verschwindet — sonst wächst der Katalog
 * mit jedem Import-Versuch, und die Suche zeigt Zauber, die niemand hat.
 */
describe("Katalog-Hygiene", () => {
  const HOMEBREW = "Kaels Schattenfaust";

  /** Der offizielle Bogen plus ein Zauber, den der SRD-Katalog nicht kennt. */
  function importWithHomebrew() {
    const draft = parseSheet(officialFields as FieldMap);
    draft.spells.push({ name: HOMEBREW, level: 4 });
    return importCharacter(draft);
  }

  const inCatalog = (name: string) =>
    searchCatalog({ query: name }).some((spell) => spell.name === name);

  it("entfernt den Platzhalter mit dem letzten Charakter, der ihn führte", () => {
    const owner = importWithHomebrew();
    expect(inCatalog(HOMEBREW)).toBe(true);

    deleteCharacter(owner);
    expect(inCatalog(HOMEBREW)).toBe(false);
  });

  it("behält ihn, solange ein anderer Charakter ihn noch führt", () => {
    const first = importWithHomebrew();
    const second = importWithHomebrew();

    deleteCharacter(first);
    expect(inCatalog(HOMEBREW)).toBe(true);

    deleteCharacter(second);
    expect(inCatalog(HOMEBREW)).toBe(false);
  });

  it("rührt SRD-Zauber nicht an", () => {
    const owner = importWithHomebrew();
    deleteCharacter(owner);

    // Misty Step stand auf demselben Bogen, gehört aber dem Katalog.
    expect(inCatalog("Misty Step")).toBe(true);
  });

  it("behält von Hand angelegte Zauber", () => {
    const owner = importWithHomebrew();
    createCustomSpell(owner, { name: "Handgemachter Zauber", level: 2 });

    deleteCharacter(owner);
    // Wer einen Zauber tippt, will ihn behalten — auch ohne Nutzer.
    expect(inCatalog("Handgemachter Zauber")).toBe(true);
  });

  it("räumt auch auf, wenn der Zauber nur aus der Liste fliegt", () => {
    const owner = importWithHomebrew();
    const entry = getCharacterSpells(owner).find(
      (e) => e.spell.name === HOMEBREW,
    )!;

    removeSpellFromCharacter(owner, entry.spell.id);
    expect(inCatalog(HOMEBREW)).toBe(false);
  });

  it("lässt den Katalog stehen, wenn ein SRD-Zauber aus der Liste fliegt", () => {
    const owner = importWithHomebrew();
    const misty = getCharacterSpells(owner).find(
      (e) => e.spell.name === "Misty Step",
    )!;

    removeSpellFromCharacter(owner, misty.spell.id);
    expect(inCatalog("Misty Step")).toBe(true);
  });
});
