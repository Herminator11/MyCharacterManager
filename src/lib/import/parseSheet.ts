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
  constructor(readonly fieldCount: number) {
    super(
      `Dieses PDF hat ${fieldCount} Formularfelder, aber keine, die ich einem bekannten Bogen zuordnen kann. ` +
        "Der Import versteht den offiziellen D&D-Charakterbogen von Wizards of the Coast " +
        "(den auch Aurora ausgibt) sowie das erweiterte Format mit Front_/Back_-Feldern.",
    );
  }
}

export function detectFormat(fields: FieldMap): SheetFormat | null {
  if (isOfficialSheet(fields)) return "official";
  if (isCustomSheet(fields)) return "custom";
  return null;
}

export function parseSheet(fields: FieldMap): ImportedCharacter {
  switch (detectFormat(fields)) {
    case "official":
      return parseOfficialSheet(fields);
    case "custom":
      return parseCustomSheet(fields);
    default:
      throw new UnknownSheetFormatError(Object.keys(fields).length);
  }
}
