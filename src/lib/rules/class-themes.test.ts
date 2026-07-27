import { describe, expect, it } from "vitest";

import { type ClassTheme, resolveBackground } from "./class-themes";

const cls = (classKey: string, level: number) => ({ classKey, level });

const wizard: ClassTheme = { key: "wizard", image: "/class-backgrounds/wizard.jpg" };
const fighter: ClassTheme = { key: "fighter", image: "/class-backgrounds/fighter.jpg" };
const rogue: ClassTheme = { key: "rogue", image: "/class-backgrounds/rogue.jpg" };

const FAKE_THEMES: Record<string, ClassTheme> = { wizard, fighter, rogue };
const lookup = (key: string) => FAKE_THEMES[key];

describe("resolveBackground", () => {
  it("keine Klassen → none", () => {
    expect(resolveBackground([], lookup)).toEqual({ kind: "none" });
  });

  it("Homebrew-Klasse ohne Bild → none", () => {
    expect(resolveBackground([cls("hausgemacht", 5)], lookup)).toEqual({
      kind: "none",
    });
  });

  it("eine Klasse mit Bild → single", () => {
    expect(resolveBackground([cls("wizard", 5)], lookup)).toEqual({
      kind: "single",
      theme: wizard,
    });
  });

  it("zwei Klassen mit Bild → blend, höchste Stufe zuerst", () => {
    expect(resolveBackground([cls("wizard", 3), cls("fighter", 7)], lookup)).toEqual({
      kind: "blend",
      primary: fighter,
      secondary: wizard,
    });
  });

  it("drei Klassen → nur die zwei höchststufigen zählen", () => {
    expect(
      resolveBackground(
        [cls("wizard", 1), cls("fighter", 7), cls("rogue", 5)],
        lookup,
      ),
    ).toEqual({ kind: "blend", primary: fighter, secondary: rogue });
  });

  it("Homebrew-Klasse wird übersprungen, nicht durch Ink ersetzt", () => {
    expect(
      resolveBackground([cls("wizard", 5), cls("hausgemacht", 9)], lookup),
    ).toEqual({ kind: "single", theme: wizard });
  });

  it("ohne echte Bilder (Standard-Manifest) → none", () => {
    // Regressionsschutz: solange CLASS_THEMES leer ist, darf die
    // Standard-Lookup-Funktion niemals etwas auflösen.
    expect(resolveBackground([cls("wizard", 5)])).toEqual({ kind: "none" });
  });
});
