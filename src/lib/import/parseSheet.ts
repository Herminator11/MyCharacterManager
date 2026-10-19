import { isAuroraSheet, parseAuroraSheet } from "./formats/aurora";
import { isCustomSheet, parseCustomSheet } from "./formats/custom";
import { isOfficialSheet, parseOfficialSheet } from "./formats/official";
import type { FieldMap, ImportedCharacter, SheetFormat } from "./types";

export * from "./types";

/**
 * Erkennt das Bogenformat und übersetzt die Formularfelder in einen
 * Charakter-Entwurf.
 *
 * Rein und ohne Nebenwirkungen: rein kommt die Feldtabelle, raus kommt ein
 * Entwurf plus eine Liste von Hinweisen. Gespeichert wird hier nichts —
 * der Entwurf geht erst durch die Bestätigungsansicht.
 *
 * Grundsatz: nichts erfinden. Was im Bogen leer ist, bleibt leer und wird
 * als Hinweis gemeldet. Einzige Ausnahme sind Werte, die zwingend aus den
 * Regeln folgen — die Trefferwürfel etwa ergeben sich aus der Klasse und
 * stehen nicht zur Diskussion.
 */

export class UnknownSheetFormatError extends Error {
  // Der Satz dazu steht im Wörterbuch (importWarnings.unknownFormat) —
  // hier nur die Zahl, die er braucht.
  constructor(readonly fieldCount: number) {
    super(`unknownFormat:${fieldCount}`);
  }
}

export function detectFormat(fields: FieldMap): SheetFormat | null {
  if (isOfficialSheet(fields)) return "official";
  if (isCustomSheet(fields)) return "custom";
  if (isAuroraSheet(fields)) return "aurora";
  return null;
}

export function parseSheet(fields: FieldMap): ImportedCharacter {
  switch (detectFormat(fields)) {
    case "official":
      return parseOfficialSheet(fields);
    case "custom":
      return parseCustomSheet(fields);
    case "aurora":
      return parseAuroraSheet(fields);
    default:
      throw new UnknownSheetFormatError(Object.keys(fields).length);
  }
}
