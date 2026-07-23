import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";

import { db } from "@/db";
import { characters, inventoryItems, resources } from "@/db/schema";
import { parseSheet } from "@/lib/import/parseSheet";
import type { ImportedCharacter, FieldMap } from "@/lib/import/types";
import kaelFields from "@/test/fixtures/kael-sheet-fields.json";

import {
  deleteCharacter,
  getCharacterSpells,
  getFeatures,
  getInventory,
  getLiveState,
  getSheet,
  listCharacters,
} from "./characters";
import { importCharacter } from "./import";
import { applyMutation } from "./live";
import { applyReimport, planReimport } from "./reimport";

/**
 * Das Versprechen des Re-Imports: der Bogen bringt den Bauplan mit, der
 * Manager behält den Spielstand. Diese Tests prüfen beide Hälften — und
 * vor allem, dass ein Levelaufstieg nichts vom Spieltisch wegräumt.
 */

let id: number;

/** Kael, aber eine Stufe weiter und mit einem neuen Zauber. */
function leveledUp(): ImportedCharacter {
  const draft = parseSheet(kaelFields as FieldMap);
  draft.classes[0].level = 6; // Sorcerer 5 → 6
  draft.hpMaxOverride = 52; // 46 → 52
  draft.spells = [
    { name: "Fireball", level: 3 },
    { name: "Misty Step", level: 2 },
  ];
  return draft;
}

/** Simuliert einen Spielabend: Schaden, verbrauchte Plätze, Beute, Notizen. */
function playASession() {
  const live = getLiveState(id)!;
  const pool = live.pools.find((p) => p.name === "Zauberplätze")!;

  applyMutation(id, { type: "hp.delta", amount: -15 });
  applyMutation(id, { type: "slot.set", poolId: pool.id, level: 2, used: 2 });
  applyMutation(id, { type: "condition.set", key: "poisoned", active: true });
  applyMutation(id, {
    type: "hitdice.set",
    classId: live.hitDice[0].classId,
    used: 3,
  });

  const sorcery = live.resources.find((r) => r.name === "Sorcery Points")!;
  applyMutation(id, { type: "resource.set", resourceId: sorcery.id, current: 1 });

  db.insert(inventoryItems)
    .values({ characterId: id, name: "Ring of Protection", description: "Beute" })
    .run();

  db.insert(resources)
    .values({
      characterId: id,
      name: "Hexblade's Curse",
      current: 0,
      max: 1,
      recovery: "short",
      source: "manual",
    })
    .run();

  db.update(characters)
    .set({ gp: 450, backstory: "Von Hand ergänzt nach Session 12." })
    .where(eq(characters.id, id))
    .run();
}

beforeEach(() => {
  for (const character of listCharacters()) deleteCharacter(character.id);
  id = importCharacter(parseSheet(kaelFields as FieldMap));
});

describe("Vorschau", () => {
  it("zeigt, was sich ändert, ohne etwas zu schreiben", () => {
    const before = getSheet(id)!.level;
    const plan = planReimport(id, leveledUp())!;

    const klassen = plan.changes.find((c) => c.label === "Klassen")!;
    expect(klassen.before).toBe("Sorcerer 5 / Warlock 5");
    expect(klassen.after).toBe("Sorcerer 6 / Warlock 5");
    expect(klassen.changed).toBe(true);

    // Nichts wurde angefasst.
    expect(getSheet(id)!.level).toBe(before);
  });

  it("markiert unveränderte Werte als unverändert", () => {
    const plan = planReimport(id, leveledUp())!;
    const cha = plan.changes.find((c) => c.label === "CHA")!;
    expect(cha.changed).toBe(false);
    expect(cha.after).toBe("20");
  });

  it("nennt neue und weggefallene Zauber", () => {
    const withSpells = importCharacter({
      ...parseSheet(kaelFields as FieldMap),
      spells: [{ name: "Misty Step", level: 2 }],
    });

    const plan = planReimport(withSpells, leveledUp())!;
    expect(plan.newSpells).toContain("Fireball");
    expect(plan.removedSpells).toEqual([]);

    deleteCharacter(withSpells);
  });

  it("gibt null für einen unbekannten Charakter", () => {
    expect(planReimport(9999, leveledUp())).toBeNull();
  });
});

describe("Bauplan wird ersetzt", () => {
  beforeEach(() => {
    playASession();
    applyReimport(id, leveledUp());
  });

  it("übernimmt das neue Level", () => {
    expect(
      getSheet(id)!.classes.map((c) => `${c.classKey} ${c.level}`),
    ).toEqual(["sorcerer 6", "warlock 5"]);
    expect(getSheet(id)!.level).toBe(11);
  });

  it("rechnet die Zauberplätze neu", () => {
    // Sorcerer 6 + Warlock 5 → Caster-Level 6 → 4/3/3
    const pool = getLiveState(id)!.pools.find((p) => p.name === "Zauberplätze")!;
    expect(pool.slots.map((s) => s.total)).toEqual([4, 3, 3]);
  });

  it("nimmt neue Zauber auf", () => {
    expect(getCharacterSpells(id).map((e) => e.spell.name)).toContain(
      "Fireball",
    );
  });

  it("hebt das HP-Maximum", () => {
    expect(getLiveState(id)!.hpMax).toBe(52);
  });
});

describe("Spielstand bleibt", () => {
  beforeEach(() => {
    playASession();
    applyReimport(id, leveledUp());
  });

  it("gibt keine verbrauchten Zauberplätze zurück", () => {
    const pool = getLiveState(id)!.pools.find((p) => p.name === "Zauberplätze")!;
    expect(pool.slots.find((s) => s.level === 2)!.used).toBe(2);
  });

  it("heilt nicht, sondern hebt die HP nur um den Zugewinn", () => {
    // 46 − 15 = 31 vor dem Aufstieg, Maximum steigt um 6 → 37 von 52.
    const live = getLiveState(id)!;
    expect(live.hpCurrent).toBe(37);
    expect(live.hpMax).toBe(52);
  });

  it("behält verbrauchte Trefferwürfel", () => {
    const sorcerer = getLiveState(id)!.hitDice.find(
      (h) => h.classKey === "sorcerer",
    )!;
    expect(sorcerer.used).toBe(3);
    expect(sorcerer.total).toBe(6); // Level ist gestiegen
  });

  it("behält verbrauchte Klassenressourcen", () => {
    const sorcery = getLiveState(id)!.resources.find(
      (r) => r.name === "Sorcery Points",
    )!;
    expect(sorcery.current).toBe(1);
    expect(sorcery.max).toBe(6); // Sorcerer 6
  });

  it("lässt von Hand angelegte Ressourcen unangetastet", () => {
    // Genau der Weg für Subklassen-Ressourcen aus Zusatzbüchern.
    const curse = getLiveState(id)!.resources.find(
      (r) => r.name === "Hexblade's Curse",
    );
    expect(curse).toBeDefined();
    expect(curse).toMatchObject({ current: 0, max: 1, recovery: "short" });
  });

  it("behält aktive Conditions", () => {
    expect(getLiveState(id)!.conditions).toContain("poisoned");
  });

  it("behält am Tisch aufgesammelte Beute", () => {
    const names = getInventory(id).map((i) => i.name);
    expect(names).toContain("Ring of Protection");
    expect(names).toContain("Blood Vial +2");
  });

  it("fasst den Geldbeutel nicht an", () => {
    expect(getSheet(id)!.character.gp).toBe(450);
  });

  it("überschreibt keine von Hand bearbeiteten Hintergrundtexte", () => {
    expect(getSheet(id)!.character.backstory).toBe(
      "Von Hand ergänzt nach Session 12.",
    );
  });

  it("legt Fähigkeiten nicht doppelt an", () => {
    const names = getFeatures(id).map((f) => f.title);
    expect(names.length).toBeGreaterThan(0);
    expect(new Set(names).size).toBe(names.length);
  });
});

describe("Grenzfälle", () => {
  it("verliert keine Zauber, die der neue Bogen nicht mehr listet", () => {
    const withSpells = importCharacter({
      ...parseSheet(kaelFields as FieldMap),
      spells: [{ name: "Shield", level: 1 }],
    });

    applyReimport(withSpells, {
      ...leveledUp(),
      spells: [{ name: "Fireball", level: 3 }],
    });

    // Shield bleibt — ein Wizard hat Zauber im Buch, die nicht auf dem
    // Bogen stehen. Entfernen kann man sie in der Zauberliste.
    const names = getCharacterSpells(withSpells).map((e) => e.spell.name);
    expect(names).toContain("Shield");
    expect(names).toContain("Fireball");

    deleteCharacter(withSpells);
  });

  it("klemmt verbrauchte Trefferwürfel beim Herabstufen", () => {
    const live = getLiveState(id)!;
    applyMutation(id, {
      type: "hitdice.set",
      classId: live.hitDice[0].classId,
      used: 5,
    });

    const downgraded = parseSheet(kaelFields as FieldMap);
    downgraded.classes[0].level = 2;
    applyReimport(id, downgraded);

    const sorcerer = getLiveState(id)!.hitDice.find(
      (h) => h.classKey === "sorcerer",
    )!;
    expect(sorcerer.total).toBe(2);
    expect(sorcerer.used).toBe(2); // nicht 5
  });

  it("meldet einen unbekannten Charakter, statt etwas anzulegen", () => {
    const before = listCharacters().length;
    expect(applyReimport(9999, leveledUp())).toBe(false);
    expect(listCharacters()).toHaveLength(before);
  });
});
