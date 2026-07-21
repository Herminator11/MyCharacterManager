import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";

import { db } from "@/db";
import { characterClasses, characters, spellPoolSlots } from "@/db/schema";
import type { LiveMutation, LiveState } from "@/lib/live-types";
import { getClass } from "@/lib/rules/classes";

import {
  createCharacter,
  deleteCharacter,
  getLiveState,
  listCharacters,
  refreshDerived,
} from "./characters";
import { applyMutation } from "./live";

/**
 * Ende-zu-Ende gegen eine echte SQLite-Datei: Charakter anlegen, Aktionen
 * anwenden, Zustand prüfen. Deckt die Abläufe ab, die am Spieltisch
 * schiefgehen würden, ohne dass man es sofort merkt.
 */

let id: number;

function addClass(characterId: number, classKey: string, level: number) {
  db.insert(characterClasses)
    .values({
      characterId,
      classKey,
      level,
      hitDie: getClass(classKey)?.hitDie ?? 8,
      sortOrder: 1,
    })
    .run();
  refreshDerived(characterId);
}

/**
 * Sorcerer 5 / Warlock 3 — der Multiclass-Fall aus dem Anforderungsdokument.
 * Kombinierter Caster-Level 5 ergibt 4/3/2 im gemeinsamen Pool, dazu
 * 2× Grad 2 aus Pact Magic. Beide bieten Grad 2 an, und Grad 3 gibt es nur
 * im gemeinsamen Pool — beides brauchen wir für die Tests.
 */
function createSorlock(): number {
  const characterId = createCharacter({
    name: "Testfigur",
    classKey: "sorcerer",
    classLevel: 5,
  });
  addClass(characterId, "warlock", 3);
  return characterId;
}

const send = (mutation: LiveMutation): LiveState => {
  const state = applyMutation(id, mutation);
  if (!state) throw new Error("Charakter verschwunden");
  return state;
};

const live = () => getLiveState(id)!;

const poolByName = (state: LiveState, name: string) =>
  state.pools.find((p) => p.name === name)!;

const slot = (state: LiveState, poolName: string, level: number) =>
  poolByName(state, poolName).slots.find((s) => s.level === level)!;

beforeEach(() => {
  for (const character of listCharacters()) deleteCharacter(character.id);
  id = createSorlock();
});

describe("Charakter anlegen", () => {
  it("startet mit vollen HP", () => {
    expect(live().hpCurrent).toBe(live().hpMax);
    expect(live().hpMax).toBeGreaterThan(0);
  });

  it("bekommt zwei getrennte Zauberplatz-Pools", () => {
    const state = live();
    expect(state.pools.map((p) => p.name)).toEqual([
      "Zauberplätze",
      "Pact Magic",
    ]);
    expect(poolByName(state, "Zauberplätze").recovery).toBe("long");
    expect(poolByName(state, "Pact Magic").recovery).toBe("short");
  });

  it("bekommt die Sorcery Points des Sorcerers", () => {
    expect(
      live().resources.find((r) => r.name === "Sorcery Points"),
    ).toMatchObject({ current: 5, max: 5, recovery: "long" });
  });
});

describe("HP", () => {
  it("zieht Schaden von den aktuellen HP ab", () => {
    const before = live().hpCurrent;
    expect(send({ type: "hp.delta", amount: -5 }).hpCurrent).toBe(before - 5);
  });

  it("zehrt erst die temporären HP auf", () => {
    send({ type: "hp.temp", value: 8 });
    const before = live().hpCurrent;

    const first = send({ type: "hp.delta", amount: -5 });
    expect(first.hpTemp).toBe(3);
    expect(first.hpCurrent).toBe(before);

    const second = send({ type: "hp.delta", amount: -5 });
    expect(second.hpTemp).toBe(0);
    expect(second.hpCurrent).toBe(before - 2); // 3 abgefangen, 2 durchgekommen
  });

  it("heilt nicht in die temporären HP hinein", () => {
    send({ type: "hp.temp", value: 4 });
    send({ type: "hp.delta", amount: -10 });
    expect(send({ type: "hp.delta", amount: 3 }).hpTemp).toBe(0);
  });

  it("fällt nicht unter 0 und nicht über das Maximum", () => {
    expect(send({ type: "hp.delta", amount: -9999 }).hpCurrent).toBe(0);
    expect(send({ type: "hp.delta", amount: 9999 }).hpCurrent).toBe(live().hpMax);
  });

  it("löscht Death Saves, sobald man wieder über 0 ist", () => {
    send({ type: "hp.set", value: 0 });
    send({ type: "death.set", successes: 2, failures: 1 });
    expect(live().deathSaveFailures).toBe(1);

    const revived = send({ type: "hp.delta", amount: 1 });
    expect(revived.deathSaveSuccesses).toBe(0);
    expect(revived.deathSaveFailures).toBe(0);
  });

  it("begrenzt Death Saves auf drei", () => {
    send({ type: "hp.set", value: 0 });
    const state = send({ type: "death.set", successes: 9, failures: 9 });
    expect(state.deathSaveSuccesses).toBe(3);
    expect(state.deathSaveFailures).toBe(3);
  });
});

describe("Zauber wirken", () => {
  it("verbraucht genau einen Slot im gewählten Pool", () => {
    const before = slot(live(), "Zauberplätze", 2).used;

    const state = send({
      type: "cast",
      poolId: poolByName(live(), "Zauberplätze").id,
      level: 2,
      spellId: null,
      spellName: "Misty Step",
      concentration: false,
    });

    expect(slot(state, "Zauberplätze", 2).used).toBe(before + 1);
    // Der andere Pool bleibt unangetastet — das ist der ganze Punkt.
    expect(slot(state, "Pact Magic", 2).used).toBe(0);
  });

  it("verbraucht keinen Slot bei einem Cantrip", () => {
    const before = live().pools;
    const state = send({
      type: "cast",
      poolId: null,
      level: 0,
      spellId: null,
      spellName: "Eldritch Blast",
      concentration: false,
    });
    expect(state.pools).toEqual(before);
  });

  it("wirkt nicht, wenn der Pool leer ist", () => {
    const poolId = poolByName(live(), "Pact Magic").id;
    const total = slot(live(), "Pact Magic", 2).total;

    const cast = () =>
      send({
        type: "cast",
        poolId,
        level: 2,
        spellId: null,
        spellName: "Hold Person",
        concentration: false,
      });

    for (let i = 0; i < total; i++) cast();
    expect(slot(live(), "Pact Magic", 2).used).toBe(total);

    // Einer zu viel darf den Verbrauch nicht über das Maximum treiben.
    expect(slot(cast(), "Pact Magic", 2).used).toBe(total);
  });

  it("setzt keine Konzentration, wenn der Cast am fehlenden Slot scheitert", () => {
    // Grad 4 gibt es in diesem Pool nicht — der Zauber wird also gar nicht
    // gewirkt und darf auch keine Konzentration hinterlassen.
    const state = send({
      type: "cast",
      poolId: poolByName(live(), "Zauberplätze").id,
      level: 4,
      spellId: null,
      spellName: "Banishment",
      concentration: true,
    });
    expect(state.concentration).toBeNull();
  });

  it("setzt die Konzentration und ersetzt die vorherige", () => {
    const poolId = poolByName(live(), "Zauberplätze").id;

    const first = send({
      type: "cast",
      poolId,
      level: 1,
      spellId: null,
      spellName: "Shield of Faith",
      concentration: true,
    });
    expect(first.concentration?.label).toBe("Shield of Faith");

    const second = send({
      type: "cast",
      poolId,
      level: 2,
      spellId: null,
      spellName: "Hold Person",
      concentration: true,
    });
    expect(second.concentration?.label).toBe("Hold Person");
    expect(second.concentration?.castAtLevel).toBe(2);
  });

  it("merkt sich den Grad beim Hochwirken", () => {
    const state = send({
      type: "cast",
      poolId: poolByName(live(), "Zauberplätze").id,
      level: 3,
      spellId: null,
      spellName: "Hold Person",
      concentration: true,
    });
    expect(state.concentration?.castAtLevel).toBe(3);
    expect(slot(state, "Zauberplätze", 3).used).toBe(1);
  });
});

describe("Rast", () => {
  function spendEverything() {
    const state = live();
    for (const pool of state.pools) {
      for (const s of pool.slots) {
        send({ type: "slot.set", poolId: pool.id, level: s.level, used: s.total });
      }
    }
    for (const resource of state.resources) {
      send({ type: "resource.set", resourceId: resource.id, current: 0 });
    }
    send({ type: "hp.delta", amount: -5 });
    send({ type: "hp.temp", value: 3 });
  }

  it("erneuert bei kurzer Rast nur Pact Magic, nicht die Zauberplätze", () => {
    spendEverything();
    const state = send({ type: "rest.short" });

    expect(slot(state, "Pact Magic", 2).used).toBe(0);
    expect(slot(state, "Zauberplätze", 1).used).toBeGreaterThan(0);
  });

  it("lässt HP bei kurzer Rast unangetastet", () => {
    const before = send({ type: "hp.delta", amount: -7 }).hpCurrent;
    expect(send({ type: "rest.short" }).hpCurrent).toBe(before);
  });

  it("erneuert bei langer Rast beide Pools und die HP", () => {
    spendEverything();
    const state = send({ type: "rest.long" });

    expect(slot(state, "Zauberplätze", 1).used).toBe(0);
    expect(slot(state, "Pact Magic", 2).used).toBe(0);
    expect(state.hpCurrent).toBe(state.hpMax);
    expect(state.hpTemp).toBe(0);
    for (const resource of state.resources) {
      expect(resource.current).toBe(resource.max);
    }
  });

  it("beendet die Konzentration bei langer Rast", () => {
    send({
      type: "cast",
      poolId: poolByName(live(), "Zauberplätze").id,
      level: 1,
      spellId: null,
      spellName: "Bless",
      concentration: true,
    });
    expect(send({ type: "rest.long" }).concentration).toBeNull();
  });

  it("gibt bei langer Rast die Hälfte der Hit Dice zurück", () => {
    for (const entry of live().hitDice) {
      send({ type: "hitdice.set", classId: entry.classId, used: entry.total });
    }

    const state = send({ type: "rest.long" });
    expect(state.hitDice.find((h) => h.classKey === "sorcerer")!.used).toBe(3); // 5 − 2
    expect(state.hitDice.find((h) => h.classKey === "warlock")!.used).toBe(2); // 3 − 1
  });
});

describe("Trefferwürfel ausgeben", () => {
  const sorcererDie = () =>
    live().hitDice.find((h) => h.classKey === "sorcerer")!;

  it("heilt um Wurf plus CON-Modifikator und verbraucht einen Würfel", () => {
    const start = send({ type: "hp.delta", amount: -20 });
    const entry = sorcererDie();

    const state = send({
      type: "hitdice.spend",
      classId: entry.classId,
      roll: 5,
    });

    expect(state.hpCurrent).toBe(start.hpCurrent + 5 + state.conModifier);
    expect(state.hitDice.find((h) => h.classId === entry.classId)!.used).toBe(
      entry.used + 1,
    );
  });

  it("heilt nie über das Maximum hinaus", () => {
    send({ type: "hp.delta", amount: -1 });
    const state = send({
      type: "hitdice.spend",
      classId: sorcererDie().classId,
      roll: 6,
    });

    expect(state.hpCurrent).toBe(state.hpMax);
  });

  it("tut nichts, wenn keine Würfel mehr übrig sind", () => {
    const entry = sorcererDie();
    send({ type: "hitdice.set", classId: entry.classId, used: entry.total });
    const before = send({ type: "hp.delta", amount: -10 });

    const state = send({
      type: "hitdice.spend",
      classId: entry.classId,
      roll: 6,
    });

    expect(state.hpCurrent).toBe(before.hpCurrent);
    expect(state.hitDice.find((h) => h.classId === entry.classId)!.used).toBe(
      entry.total,
    );
  });

  it("verbraucht den Würfel auch dann, wenn der Wurf nichts einbringt", () => {
    // Negativer CON-Modifikator kann einen niedrigen Wurf auf null drücken.
    // Der Würfel ist trotzdem weg — sonst würfelte man risikolos nach.
    db.update(characters).set({ con: 6 }).where(eq(characters.id, id)).run();
    refreshDerived(id);

    const entry = sorcererDie();
    const before = send({ type: "hp.delta", amount: -15 });

    const state = send({
      type: "hitdice.spend",
      classId: entry.classId,
      roll: 1,
    });

    expect(state.conModifier).toBe(-2);
    expect(state.hpCurrent).toBe(before.hpCurrent);
    expect(state.hitDice.find((h) => h.classId === entry.classId)!.used).toBe(
      entry.used + 1,
    );
  });
});

describe("Conditions", () => {
  it("lassen sich setzen und wieder entfernen", () => {
    expect(
      send({ type: "condition.set", key: "poisoned", active: true }).conditions,
    ).toContain("poisoned");
    expect(
      send({ type: "condition.set", key: "poisoned", active: false }).conditions,
    ).not.toContain("poisoned");
  });

  it("verdoppeln sich nicht bei doppeltem Setzen", () => {
    send({ type: "condition.set", key: "prone", active: true });
    const state = send({ type: "condition.set", key: "prone", active: true });
    expect(state.conditions.filter((c) => c === "prone")).toHaveLength(1);
  });
});

describe("Ressourcen", () => {
  it("bleiben zwischen 0 und Maximum", () => {
    const resource = live().resources[0];

    expect(
      send({ type: "resource.set", resourceId: resource.id, current: -5 })
        .resources[0].current,
    ).toBe(0);

    expect(
      send({ type: "resource.set", resourceId: resource.id, current: 999 })
        .resources[0].current,
    ).toBe(resource.max);
  });
});

describe("Levelaufstieg", () => {
  it("nimmt keine verbrauchten Slots zurück", () => {
    const poolId = poolByName(live(), "Zauberplätze").id;
    send({ type: "slot.set", poolId, level: 1, used: 2 });

    db.update(characterClasses)
      .set({ level: 5 })
      .where(eq(characterClasses.classKey, "sorcerer"))
      .run();
    refreshDerived(id);

    expect(slot(live(), "Zauberplätze", 1).used).toBe(2);
  });
});

describe("Aufräumen", () => {
  it("löscht mit dem Charakter auch Pools und Slots", () => {
    const poolIds = live().pools.map((p) => p.id);
    expect(poolIds.length).toBeGreaterThan(0);

    deleteCharacter(id);

    const remaining = db.select().from(spellPoolSlots).all();
    expect(remaining.filter((s) => poolIds.includes(s.poolId))).toHaveLength(0);
  });
});
