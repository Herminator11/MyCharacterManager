import { CLASSES, getClass } from "@/lib/rules/classes";

import type { FieldMap, ImportedClass, ImportWarning } from "./types";

/** Gemeinsame Lesehilfen für beide Bogenformate. */

export const text = (fields: FieldMap, key: string): string => {
  const value = fields[key];
  return typeof value === "string" ? value.trim() : "";
};

export const checked = (fields: FieldMap, key: string): boolean =>
  fields[key] === true;

/** Liest "+4", "-1", "30 ft." oder "" als Zahl; null wenn nichts drinsteht. */
export function number(fields: FieldMap, key: string): number | null {
  const raw = text(fields, key).replace(/[−–—]/g, "-");
  const match = raw.match(/-?\d+/);
  return match ? Number(match[0]) : null;
}

/** PDF-Textfelder trennen Zeilen mit \r — für Markdown braucht es \n. */
export function clean(value: string): string {
  return value.replace(/\r\n?/g, "\n").trim();
}

/**
 * Deutsche Klassennamen, weil Bögen oft gemischt ausgefüllt sind —
 * Kaels Rasse steht als „Mensch“ da, die Klasse aber englisch.
 */
const GERMAN_CLASS_NAMES: Record<string, string> = {
  barbar: "barbarian",
  barde: "bard",
  kleriker: "cleric",
  priester: "cleric",
  druide: "druid",
  kämpfer: "fighter",
  kaempfer: "fighter",
  krieger: "fighter",
  mönch: "monk",
  moench: "monk",
  paladin: "paladin",
  waldläufer: "ranger",
  waldlaeufer: "ranger",
  schurke: "rogue",
  dieb: "rogue",
  zauberer: "sorcerer",
  magier: "wizard",
  hexenmeister: "warlock",
  hexer: "warlock",
};

export function resolveClassKey(rawName: string): string | undefined {
  const cleaned = rawName.trim().toLowerCase();
  if (!cleaned) return undefined;

  const english = CLASSES.find((c) => c.name.toLowerCase() === cleaned);
  if (english) return english.key;

  return GERMAN_CLASS_NAMES[cleaned];
}

export function buildClass(
  rawName: string,
  level: number,
  subclass: string,
  warnings: ImportWarning[],
): ImportedClass {
  const classKey = resolveClassKey(rawName);

  if (!classKey) {
    warnings.push({ key: "unknownClass", params: { name: rawName } });
  }

  return {
    classKey: classKey ?? "",
    rawName,
    level: Math.min(Math.max(level, 1), 20),
    subclass,
    hitDie: classKey ? (getClass(classKey)?.hitDie ?? 8) : 8,
    known: Boolean(classKey),
  };
}

/**
 * Zerlegt das kombinierte Feld des offiziellen Bogens, in dem Klasse und
 * Level in einer Zeile stehen.
 *
 * Muss mit allem zurechtkommen, was Leute dort tatsächlich hineinschreiben:
 * „Sorcerer 5 / Warlock 5“, „Fighter 3, Rogue 2“, „Wizard 10“ — und vor
 * allem mit der Klammerschreibweise „Sorcerer 5 (Shadow Magic)“, sobald
 * Subklassen aus Zusatzbüchern im Spiel sind.
 *
 * Das Komma trennt, aber nur außerhalb von Klammern: „Warlock 5 (Hexblade,
 * Pact of the Blade)“ ist eine Klasse, „Fighter 3, Rogue 2“ sind zwei.
 */
export function parseClassLevelString(
  raw: string,
  warnings: ImportWarning[],
): ImportedClass[] {
  return splitOutsideParentheses(raw)
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      // Klammerinhalt herauslösen — das ist die Subklasse, nicht der Name.
      const subclass = part.match(/\(([^)]*)\)/)?.[1]?.trim() ?? "";
      const withoutSubclass = part.replace(/\([^)]*\)/g, " ").trim();

      // Level ist die letzte Zahl im Rest, davor steht der Klassenname.
      const match = withoutSubclass.match(/^(.*?)[\s.:-]*(\d+)\s*$/);
      const rawName = (match ? match[1] : withoutSubclass).trim();
      const level = match ? Number(match[2]) : 1;

      if (!match && rawName) {
        warnings.push({ key: "missingLevel", params: { name: rawName } });
      }

      return buildClass(rawName, level, subclass, warnings);
    })
    .filter((entry) => entry.rawName.length > 0);
}

/** Trefferwürfel aus den Klassen, falls der Bogen sie leer lässt. */
export function noteDerivedHitDice(
  classes: ImportedClass[],
  sheetValue: string,
  warnings: ImportWarning[],
) {
  if (sheetValue || classes.length === 0) return;

  const derived = classes
    .filter((c) => c.known)
    .map((c) => `${c.level}d${c.hitDie}`)
    .join(" + ");

  if (derived) {
    warnings.push({ key: "derivedHitDice", params: { dice: derived } });
  }
}

/**
 * Der offizielle Bogen kennt keine Expertise-Kästchen. Wer eine Klasse
 * spielt, die Expertise bekommt, muss sie deshalb von Hand nachtragen.
 */
export function noteMissingExpertise(
  classes: ImportedClass[],
  warnings: ImportWarning[],
) {
  const affected = classes
    .filter((c) => c.classKey === "rogue" || c.classKey === "bard")
    .map((c) => c.rawName);

  if (affected.length > 0) {
    warnings.push({ key: "missingExpertise", params: { classes: affected } });
  }
}

/**
 * Trennt an Schrägstrich, Komma, Semikolon und „und“/„and“ — aber nur
 * außerhalb von Klammern, damit Subklassen mit Komma heil bleiben.
 */
function splitOutsideParentheses(raw: string): string[] {
  const parts: string[] = [];
  let current = "";
  let depth = 0;

  for (let i = 0; i < raw.length; i++) {
    const char = raw[i];

    if (char === "(") depth++;
    else if (char === ")") depth = Math.max(0, depth - 1);

    if (depth === 0) {
      if (char === "/" || char === "," || char === ";") {
        parts.push(current);
        current = "";
        continue;
      }
      // „und“ bzw. „and“ als eigenständiges Wort.
      const word = raw.slice(i).match(/^(und|and)\b/i);
      if (word && (i === 0 || /\s/.test(raw[i - 1]))) {
        parts.push(current);
        current = "";
        i += word[0].length - 1;
        continue;
      }
    }

    current += char;
  }

  parts.push(current);
  return parts.filter((part) => part.trim().length > 0);
}
