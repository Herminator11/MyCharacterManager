import { describe, expect, it } from "vitest";

import { renderLogLine } from "./log";
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

describe("Kampflog in drei Modi", () => {
  const damage = {
    text: "12 Schaden",
    detail: "30 → 20 · 2 über temporäre HP",
    message: {
      key: "damage" as const,
      params: { amount: 12, from: 30, to: 20, absorbed: 2 },
    },
  };

  it("Deutsch bildet den Satz aus der Meldung, mit TP", () => {
    expect(renderLogLine(getMessages("de"), damage)).toEqual({
      text: "12 Schaden",
      detail: "30 → 20 · 2 über temporäre TP",
    });
  });

  it("gemischter Modus: deutscher Satz, englischer Regelbegriff", () => {
    expect(renderLogLine(getMessages("de-en"), damage).detail).toBe(
      "30 → 20 · 2 über temporäre HP",
    );
  });

  it("Englisch", () => {
    expect(renderLogLine(getMessages("en"), damage)).toEqual({
      text: "12 damage",
      detail: "30 → 20 · 2 absorbed by temporary HP",
    });
  });

  it("ein gewirkter Zauber nennt Grad und Pool in der Sprache des Geräts", () => {
    const cast = {
      text: "Fireball",
      detail: "Grad 3 · Zauberplätze",
      message: {
        key: "cast" as const,
        params: { spell: "Fireball", level: 3, pool: "Zauberplätze", poolAutoKey: "spellcasting" },
      },
    };
    expect(renderLogLine(getMessages("en"), cast)).toEqual({
      text: "Fireball",
      detail: "Level 3 · Spell Slots",
    });
  });

  it("der Todesrettungswurf steht in der Einzahl, in beiden Glossaren", () => {
    const save = {
      text: "",
      detail: "",
      message: { key: "deathSave" as const, params: { successes: 1, failures: 2 } },
    };
    expect(renderLogLine(getMessages("de"), save).text).toBe("Todesrettungswurf");
    expect(renderLogLine(getMessages("en"), save).text).toBe("Death Save");
  });

  it("alte Einträge ohne Meldung zeigen ihren gespeicherten Satz", () => {
    expect(
      renderLogLine(getMessages("en"), { text: "12 Schaden", detail: "30 → 18", message: null }),
    ).toEqual({ text: "12 Schaden", detail: "30 → 18" });
  });
});
