import { describe, expect, it } from "vitest";

import { getMessages } from "./messages";
import { isMode, localeOf, MODES, resolveMode } from "./modes";
import { termsDe, termsEn } from "./terms";
import { uiDe, uiEn } from "./ui";

/** Alle Pfade eines verschachtelten Wörterbuchs, mit Art des Werts. */
function shape(value: unknown, prefix = ""): string[] {
  if (typeof value === "string") return [`${prefix}:string`];
  if (typeof value === "function") return [`${prefix}:function/${value.length}`];
  return Object.entries(value as Record<string, unknown>)
    .flatMap(([key, inner]) => shape(inner, prefix ? `${prefix}.${key}` : key))
    .sort();
}

describe("Wörterbücher", () => {
  // Der Typ erzwingt dieselben Schlüssel schon beim Kompilieren; der Test
  // fängt zusätzlich ab, was der Typ durchlässt — etwa eine Funktion, die
  // ihren Parameter vergisst und dann "Grad undefined" schreibt.
  it("Bedienung: Englisch hat genau die Schlüssel des Deutschen", () => {
    expect(shape(uiEn)).toEqual(shape(uiDe));
  });

  it("Glossar: Englisch hat genau die Schlüssel des Deutschen", () => {
    expect(shape(termsEn)).toEqual(shape(termsDe));
  });

  it("kein Text ist leer", () => {
    for (const dict of [uiDe, uiEn, termsDe, termsEn]) {
      const strings = JSON.stringify(dict).match(/"[^"]*"/g) ?? [];
      expect(strings).not.toContain('""');
    }
  });
});

describe("drei Modi", () => {
  it("Deutsch: Bedienung und Regelbegriffe deutsch", () => {
    const t = getMessages("de");
    expect(t.tabs.overview).toBe("Übersicht");
    expect(t.term.armorClassShort).toBe("RK");
    expect(t.term.spellLevel(3)).toBe("Grad 3");
  });

  it("Deutsch mit englischen Regelbegriffen: deutsche Bedienung, englisches Glossar", () => {
    const t = getMessages("de-en");
    expect(t.tabs.overview).toBe("Übersicht");
    expect(t.term.armorClassShort).toBe("AC");
    expect(t.term.spellSaveDc).toBe("Spell DC");
    // Zahlen folgen der Bedienung, nicht dem Glossar.
    expect(t.number(6500)).toBe("6.500");
  });

  it("Englisch: alles englisch, Zahlen mit Komma als Tausendertrenner", () => {
    const t = getMessages("en");
    expect(t.tabs.overview).toBe("Overview");
    expect(t.term.armorClassShort).toBe("AC");
    expect(t.term.spellAttack("INT")).toBe("Spell Attack (INT)");
    expect(t.number(6500)).toBe("6,500");
  });

  it("html lang folgt der Bedienung", () => {
    expect(MODES.map(localeOf)).toEqual(["de-DE", "de-DE", "en-US"]);
  });
});

describe("Modus bestimmen", () => {
  it("ein gültiger Cookie gewinnt immer", () => {
    expect(resolveMode("de-en", "en-US,en;q=0.9")).toBe("de-en");
    expect(resolveMode("en", "de-DE")).toBe("en");
  });

  it("ohne Cookie entscheidet die erste Browsersprache", () => {
    expect(resolveMode(undefined, "de-AT,de;q=0.9,en;q=0.8")).toBe("de");
    expect(resolveMode(undefined, "en-GB,en;q=0.9,de;q=0.5")).toBe("en");
    expect(resolveMode(undefined, "fr-FR")).toBe("en");
  });

  it("den gemischten Modus rät die App nie", () => {
    for (const header of ["de-DE", "en-US", "de-DE,en;q=0.9", null]) {
      expect(resolveMode(undefined, header)).not.toBe("de-en");
    }
  });

  it("ohne Header und ohne Cookie: Deutsch, wie bisher", () => {
    expect(resolveMode(undefined, null)).toBe("de");
  });

  it("ein manipulierter Cookie fällt auf die Browsersprache zurück", () => {
    expect(isMode("fr")).toBe(false);
    expect(resolveMode("fr", "en-US")).toBe("en");
  });
});
