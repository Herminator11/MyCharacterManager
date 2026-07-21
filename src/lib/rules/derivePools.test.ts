import { describe, expect, it } from "vitest";

import { derivePools, POOL_PACT_MAGIC, POOL_SPELLCASTING } from "./derivePools";

describe("derivePools", () => {
  it("gibt einem Nicht-Caster gar keinen Pool", () => {
    expect(derivePools([{ classKey: "barbarian", level: 5 }])).toEqual([]);
  });

  it("gibt einem reinen Warlock nur Pact Magic", () => {
    const pools = derivePools([{ classKey: "warlock", level: 5 }]);
    expect(pools).toHaveLength(1);
    expect(pools[0]).toMatchObject({
      autoKey: POOL_PACT_MAGIC,
      recovery: "short",
      spellcastingAbility: "cha",
    });
    expect(pools[0].slots).toEqual([0, 0, 2, 0, 0, 0, 0, 0, 0]);
  });

  it("gibt einem reinen Sorcerer nur den Spellcasting-Pool", () => {
    const pools = derivePools([{ classKey: "sorcerer", level: 5 }]);
    expect(pools).toHaveLength(1);
    expect(pools[0]).toMatchObject({
      autoKey: POOL_SPELLCASTING,
      recovery: "long",
    });
  });

  it("gibt dem Sorcerer/Warlock zwei getrennte Pools", () => {
    const pools = derivePools([
      { classKey: "sorcerer", level: 4 },
      { classKey: "warlock", level: 3 },
    ]);

    expect(pools.map((p) => p.autoKey)).toEqual([
      POOL_SPELLCASTING,
      POOL_PACT_MAGIC,
    ]);
    // Beide bieten Grad 2 an — der Fall aus dem Anforderungsdokument.
    expect(pools[0].slots[1]).toBe(3);
    expect(pools[1].slots[1]).toBe(2);
    // …erholen sich aber unterschiedlich.
    expect(pools[0].recovery).toBe("long");
    expect(pools[1].recovery).toBe("short");
  });

  it("wählt das Zauberattribut der höchststufigen Casterklasse", () => {
    expect(
      derivePools([
        { classKey: "wizard", level: 2 },
        { classKey: "cleric", level: 6 },
      ])[0].spellcastingAbility,
    ).toBe("wis");

    expect(
      derivePools([
        { classKey: "wizard", level: 7 },
        { classKey: "cleric", level: 2 },
      ])[0].spellcastingAbility,
    ).toBe("int");
  });

  it("lässt den Warlock das Attribut des gemeinsamen Pools nicht bestimmen", () => {
    // Warlock ist hier höherstufig, trotzdem muss INT vom Wizard gewinnen.
    const pools = derivePools([
      { classKey: "wizard", level: 3 },
      { classKey: "warlock", level: 9 },
    ]);
    expect(pools[0].spellcastingAbility).toBe("int");
  });
});
