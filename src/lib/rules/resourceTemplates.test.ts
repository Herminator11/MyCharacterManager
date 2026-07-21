import { describe, expect, it } from "vitest";

import type { AbilityScores } from "./derive";
import { deriveResources } from "./resourceTemplates";

const scores: AbilityScores = {
  str: 10,
  dex: 10,
  con: 10,
  int: 10,
  wis: 10,
  cha: 18, // CHA +4
};

const find = (
  resources: ReturnType<typeof deriveResources>,
  autoKey: string,
) => resources.find((r) => r.autoKey === autoKey);

describe("deriveResources", () => {
  it("gibt dem Barbaren seine Rage-Nutzungen", () => {
    const rage = find(
      deriveResources([{ classKey: "barbarian", level: 5 }], scores),
      "barbarian:rage",
    );
    expect(rage).toMatchObject({
      name: "Rage",
      max: 3,
      recovery: "long",
      display: "pips",
    });
    expect(rage?.note).toBe("+2 Schaden");
  });

  it("gibt dem Sorcerer seine Sorcery Points als Zähler", () => {
    expect(
      find(
        deriveResources([{ classKey: "sorcerer", level: 5 }], scores),
        "sorcerer:sorcery-points",
      ),
    ).toMatchObject({ max: 5, recovery: "long", display: "counter" });
  });

  it("gibt dem Mönch Ki mit kurzer Rast", () => {
    expect(
      find(deriveResources([{ classKey: "monk", level: 5 }], scores), "monk:ki"),
    ).toMatchObject({ max: 5, recovery: "short" });
  });

  it("leitet Bardic Inspiration aus CHA ab, nicht aus der Würfelgröße", () => {
    const bardic = find(
      deriveResources([{ classKey: "bard", level: 3 }], scores),
      "bard:bardic-inspiration",
    );
    expect(bardic?.max).toBe(4); // CHA +4, nicht d6
    expect(bardic?.note).toBe("d6");
  });

  it("lässt Bardic Inspiration ab Stufe 5 bei kurzer Rast zurückkommen", () => {
    const early = find(
      deriveResources([{ classKey: "bard", level: 4 }], scores),
      "bard:bardic-inspiration",
    );
    const late = find(
      deriveResources([{ classKey: "bard", level: 5 }], scores),
      "bard:bardic-inspiration",
    );
    expect(early?.recovery).toBe("long");
    expect(late?.recovery).toBe("short");
  });

  it("gibt Bardic Inspiration mindestens einmal, auch bei mieserem CHA", () => {
    const dump: AbilityScores = { ...scores, cha: 8 };
    expect(
      find(
        deriveResources([{ classKey: "bard", level: 1 }], dump),
        "bard:bardic-inspiration",
      )?.max,
    ).toBe(1);
  });

  it("skaliert Lay on Hands mit dem Paladin-Level", () => {
    expect(
      find(
        deriveResources([{ classKey: "paladin", level: 6 }], scores),
        "paladin:lay-on-hands",
      ),
    ).toMatchObject({ max: 30, display: "counter" });
  });

  it("gibt Wild Shape erst ab Stufe 2", () => {
    expect(
      find(
        deriveResources([{ classKey: "druid", level: 1 }], scores),
        "druid:wild-shape",
      ),
    ).toBeUndefined();
    expect(
      find(
        deriveResources([{ classKey: "druid", level: 2 }], scores),
        "druid:wild-shape",
      )?.max,
    ).toBe(2);
  });

  it("zählt Mystic Arcanum erst ab Warlock 11", () => {
    expect(
      find(
        deriveResources([{ classKey: "warlock", level: 10 }], scores),
        "warlock:mystic-arcanum",
      ),
    ).toBeUndefined();

    const level20 = find(
      deriveResources([{ classKey: "warlock", level: 20 }], scores),
      "warlock:mystic-arcanum",
    );
    expect(level20?.max).toBe(4);
    expect(level20?.note).toBe("Grad 6, 7, 8, 9");
  });

  it("sammelt Ressourcen aus allen Klassen eines Multiclass-Charakters", () => {
    const resources = deriveResources(
      [
        { classKey: "sorcerer", level: 3 },
        { classKey: "warlock", level: 2 },
      ],
      scores,
    );
    expect(find(resources, "sorcerer:sorcery-points")?.max).toBe(3);
    // Warlock 2 hat noch kein Mystic Arcanum.
    expect(find(resources, "warlock:mystic-arcanum")).toBeUndefined();
  });

  it("gibt einem reinen Kämpfer keine Zauberressourcen", () => {
    const resources = deriveResources(
      [{ classKey: "fighter", level: 5 }],
      scores,
    );
    expect(resources.map((r) => r.autoKey)).toEqual(["fighter:action-surge"]);
  });
});
