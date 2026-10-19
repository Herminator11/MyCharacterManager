import { describe, expect, it } from "vitest";

import { parseClassLevelString } from "@/lib/import/fields";
import type { ImportWarning } from "@/lib/import/types";
import { combinedCasterLevel, spellcastingSlots } from "@/lib/rules/multiclass";

/**
 * Das Feld „ClassLevel“ des offiziellen Bogens ist Freitext. Diese Tests
 * decken ab, was Leute tatsächlich hineinschreiben — insbesondere die
 * Klammerschreibweise, sobald Subklassen aus Zusatzbüchern dazukommen.
 */

const parse = (input: string) => {
  const warnings: ImportWarning[] = [];
  return { classes: parseClassLevelString(input, warnings), warnings };
};

describe("Klassenzeile lesen", () => {
  it.each([
    ["Wizard 10", [["wizard", 10, ""]]],
    ["Sorcerer 5 / Warlock 5", [["sorcerer", 5, ""], ["warlock", 5, ""]]],
    ["Fighter 3; Rogue 2", [["fighter", 3, ""], ["rogue", 2, ""]]],
    ["Barde 4 und Schurke 1", [["bard", 4, ""], ["rogue", 1, ""]]],
  ])("versteht „%s“", (input, expected) => {
    expect(
      parse(input).classes.map((c) => [c.classKey, c.level, c.subclass]),
    ).toEqual(expected);
  });

  it("liest die Subklasse aus der Klammer, statt am Namen zu scheitern", () => {
    const { classes } = parse("Sorcerer 5 (Shadow Magic)");
    expect(classes).toHaveLength(1);
    expect(classes[0]).toMatchObject({
      classKey: "sorcerer",
      level: 5,
      subclass: "Shadow Magic",
    });
  });

  it("kommt mit Subklassen bei mehreren Klassen zurecht", () => {
    const { classes } = parse("Warlock 5 (Hexblade) / Sorcerer 5 (Shadow Magic)");
    expect(classes.map((c) => [c.classKey, c.level, c.subclass])).toEqual([
      ["warlock", 5, "Hexblade"],
      ["sorcerer", 5, "Shadow Magic"],
    ]);
  });

  it("versteht die Klammer auch vor der Stufe", () => {
    const { classes } = parse("Ranger (Gloom Stalker) 4");
    expect(classes[0]).toMatchObject({
      classKey: "ranger",
      level: 4,
      subclass: "Gloom Stalker",
    });
  });

  it("zerlegt ein Komma in der Klammer nicht in zwei Klassen", () => {
    // "Pact of the Blade" enthält ein Komma — das darf nicht trennen.
    const { classes } = parse("Warlock 5 (Hexblade, Pact of the Blade)");
    expect(classes).toHaveLength(1);
    expect(classes[0].subclass).toBe("Hexblade, Pact of the Blade");
  });
});

describe("Artificer", () => {
  it("wird als Klasse erkannt", () => {
    expect(parse("Artificer 6").classes[0]).toMatchObject({
      classKey: "artificer",
      level: 6,
      hitDie: 8,
      known: true,
    });
  });

  it("hat schon auf Stufe 1 Zauberplätze — anders als Paladin und Ranger", () => {
    expect(spellcastingSlots([{ classKey: "artificer", level: 1 }])[0]).toBe(2);
    expect(spellcastingSlots([{ classKey: "paladin", level: 1 }])[0]).toBe(0);
  });

  it("folgt der eigenen Tabelle, obwohl er nicht im SRD steht", () => {
    // Artificer 5 → 4/2, Artificer 9 → 4/3/2, Artificer 20 → 4/3/3/3/2
    expect(spellcastingSlots([{ classKey: "artificer", level: 5 }])).toEqual([
      4, 2, 0, 0, 0, 0, 0, 0, 0,
    ]);
    expect(spellcastingSlots([{ classKey: "artificer", level: 9 }])).toEqual([
      4, 3, 2, 0, 0, 0, 0, 0, 0,
    ]);
    expect(spellcastingSlots([{ classKey: "artificer", level: 20 }])).toEqual([
      4, 3, 3, 3, 2, 0, 0, 0, 0,
    ]);
  });

  it("rundet beim Multiclassing auf, nicht ab", () => {
    // Artificer 5 → ceil(5/2) = 3, ein Paladin 5 käme nur auf floor(5/2) = 2.
    expect(combinedCasterLevel([{ classKey: "artificer", level: 5 }])).toBe(3);
    expect(combinedCasterLevel([{ classKey: "paladin", level: 5 }])).toBe(2);
  });

  it("addiert sich korrekt mit einem Vollcaster", () => {
    // Artificer 3 → 2, Wizard 4 → 4, zusammen Caster-Level 6 → 4/3/3
    expect(
      spellcastingSlots([
        { classKey: "artificer", level: 3 },
        { classKey: "wizard", level: 4 },
      ]),
    ).toEqual([4, 3, 3, 0, 0, 0, 0, 0, 0]);
  });
});
