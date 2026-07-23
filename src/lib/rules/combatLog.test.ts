import { describe, expect, it } from "vitest";

import type { LiveState } from "@/lib/live-types";

import { describeMutation, summarize } from "./combatLog";

/**
 * Das Kampflog übersetzt zwei Zustände in einen Satz. Diese Tests halten
 * fest, was dabei erwähnt wird und was nicht — beides ist eine Entscheidung.
 */

const BASE: LiveState = {
  characterId: 1,
  hpCurrent: 30,
  hpTemp: 0,
  hpMax: 40,
  deathSaveSuccesses: 0,
  deathSaveFailures: 0,
  stabilized: false,
  inspiration: false,
  hitDice: [{ classId: 1, classKey: "warlock", hitDie: 8, total: 5, used: 0 }],
  conModifier: 2,
  turn: { action: false, bonus: false, reaction: false },
  round: 1,
  log: [],
  pools: [
    {
      id: 7,
      name: "Pact Magic",
      recovery: "short",
      slots: [{ level: 2, total: 2, used: 0 }],
    },
  ],
  resources: [
    {
      id: 3,
      name: "Hexblade's Curse",
      current: 1,
      max: 1,
      recovery: "short",
      display: "pips",
      note: "",
    },
  ],
  conditions: [],
  concentration: null,
  rev: 0,
};

const state = (patch: Partial<LiveState>): LiveState => ({ ...BASE, ...patch });

describe("Schaden und Heilung", () => {
  it("nennt den Schaden und den Weg der HP", () => {
    const line = describeMutation(
      { type: "hp.delta", amount: -7 },
      BASE,
      state({ hpCurrent: 23 }),
    );

    expect(line).toEqual({
      kind: "damage",
      text: "7 Schaden",
      detail: "30 → 23",
      actionCost: null,
      amount: 7,
    });
  });

  it("sagt dazu, wie viel die temporären HP geschluckt haben", () => {
    const line = describeMutation(
      { type: "hp.delta", amount: -7 },
      state({ hpTemp: 5 }),
      state({ hpCurrent: 28, hpTemp: 0 }),
    );

    expect(line?.detail).toBe("30 → 28 · 5 über temporäre HP");
  });

  it("erwähnt Heilung mit dem tatsächlich geheilten Betrag", () => {
    const line = describeMutation(
      { type: "hp.delta", amount: 12 },
      state({ hpCurrent: 35 }),
      state({ hpCurrent: 40 }),
    );

    // Angesagt waren 12, angekommen sind 5 — das Maximum deckelt.
    expect(line?.kind).toBe("heal");
    expect(line?.amount).toBe(5);
  });

  it("schweigt bei einer Änderung um null", () => {
    expect(describeMutation({ type: "hp.delta", amount: 0 }, BASE, BASE)).toBeNull();
  });
});

describe("Zauber", () => {
  const cast = {
    type: "cast",
    poolId: 7,
    level: 2,
    spellId: 42,
    spellName: "Misty Step",
    concentration: false,
    cost: "bonus",
  } as const;

  it("nennt Grad, Pool und die Aktionskosten getrennt fürs Zeichen", () => {
    const after = state({
      pools: [
        {
          id: 7,
          name: "Pact Magic",
          recovery: "short",
          slots: [{ level: 2, total: 2, used: 1 }],
        },
      ],
    });

    expect(describeMutation(cast, BASE, after)).toEqual({
      kind: "cast",
      text: "Misty Step",
      detail: "Grad 2 · Pact Magic",
      actionCost: "bonus",
      amount: 0,
    });
  });

  it("schweigt, wenn der Slot gar nicht verbraucht wurde", () => {
    // Das andere Gerät war schneller: der Cast fand nicht statt und darf
    // deshalb auch nicht im Log stehen.
    expect(describeMutation(cast, BASE, BASE)).toBeNull();
  });

  it("nennt Zaubertricks ohne Grad", () => {
    const line = describeMutation(
      {
        type: "cast",
        poolId: null,
        level: 0,
        spellId: 1,
        spellName: "Eldritch Blast",
        concentration: false,
        cost: "action",
      },
      BASE,
      BASE,
    );

    expect(line?.detail).toBe("Zaubertrick");
    expect(line?.actionCost).toBe("action");
  });
});

describe("Trefferwürfel", () => {
  it("hält fest, was der Würfel eingebracht hat", () => {
    const after = state({
      hpCurrent: 37,
      hitDice: [
        { classId: 1, classKey: "warlock", hitDie: 8, total: 5, used: 1 },
      ],
    });

    const line = describeMutation(
      { type: "hitdice.spend", classId: 1, roll: 5 },
      BASE,
      after,
    );

    expect(line?.text).toBe("Trefferwürfel d8");
    expect(line?.detail).toBe("+7 HP · 30 → 37");
    expect(line?.amount).toBe(7);
  });

  it("schweigt, wenn kein Würfel mehr da war", () => {
    expect(
      describeMutation({ type: "hitdice.spend", classId: 1, roll: 5 }, BASE, BASE),
    ).toBeNull();
  });
});

describe("Was nicht im Log landet", () => {
  it("verschweigt Zugkonten, einzelne Slots und Korrekturen am Zähler", () => {
    const silent = [
      { type: "turn.set", slot: "action", used: true },
      { type: "turn.end" },
      { type: "slot.set", poolId: 7, level: 2, used: 1 },
      { type: "hitdice.set", classId: 1, used: 2 },
      { type: "battle.start" },
      { type: "battle.end" },
    ] as const;

    for (const mutation of silent) {
      expect(describeMutation(mutation, BASE, BASE)).toBeNull();
    }
  });

  it("verschweigt Änderungen, die nichts geändert haben", () => {
    expect(
      describeMutation(
        { type: "resource.set", resourceId: 3, current: 1 },
        BASE,
        BASE,
      ),
    ).toBeNull();

    expect(
      describeMutation(
        { type: "condition.set", key: "poisoned", active: false },
        BASE,
        BASE,
      ),
    ).toBeNull();
  });
});

describe("Conditions und Ressourcen", () => {
  it("nennt die Condition beim englischen Regelbegriff", () => {
    const line = describeMutation(
      { type: "condition.set", key: "poisoned", active: true },
      BASE,
      state({ conditions: ["poisoned"] }),
    );

    expect(line?.text).toBe("Poisoned");
  });

  it("unterscheidet Einsetzen von Zurücklegen", () => {
    const spent = state({ resources: [{ ...BASE.resources[0], current: 0 }] });

    expect(
      describeMutation({ type: "resource.set", resourceId: 3, current: 0 }, BASE, spent)
        ?.text,
    ).toBe("Hexblade's Curse eingesetzt");

    expect(
      describeMutation({ type: "resource.set", resourceId: 3, current: 1 }, spent, BASE)
        ?.text,
    ).toBe("Hexblade's Curse zurückgelegt");
  });
});

describe("Zusammenfassung fürs Logbuch", () => {
  it("zählt Schaden, Heilung und Zauber zusammen", () => {
    expect(
      summarize(3, [
        { kind: "damage", amount: 7 },
        { kind: "damage", amount: 5 },
        { kind: "heal", amount: 9 },
        { kind: "cast", amount: 0 },
        { kind: "cast", amount: 0 },
        { kind: "condition", amount: 0 },
      ]),
    ).toBe("Kampf: 3 Runden · 12 Schaden genommen · 9 HP geheilt · 2 Zauber gewirkt");
  });

  it("lässt weg, was nicht vorkam", () => {
    expect(summarize(1, [{ kind: "cast", amount: 0 }])).toBe(
      "Kampf: 1 Runde · 1 Zauber gewirkt",
    );
  });

  it("hinterlässt nichts, wenn nichts passiert ist", () => {
    // Ein Kampf, der aus einem Fehltipper bestand, gehört nicht ins Logbuch.
    expect(summarize(1, [])).toBeNull();
  });
});
