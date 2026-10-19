/**
 * Die drei Sprachmodi und wie man vom Cookie zu einem kommt.
 *
 * Pro Gerät, nicht pro Charakter und nicht für die ganze Installation:
 * am selben Tisch liest eine Spielerin auf Deutsch mit, ein Freund auf
 * Englisch — beide auf demselben Charakter, beide über dieselbe
 * selbst gehostete App. Deshalb ein Cookie statt einer Spalte in der DB.
 *
 * Bewusst nicht in der URL (/de/c/5): die Charakter-Links mit Slug sind
 * Lesezeichen am Handy, und eine Sprachwahl soll keinen davon brechen.
 *
 * Keine Server-Only-Abhängigkeit — der Umschalter im Browser braucht
 * dieselben Konstanten.
 */
export const MODES = ["de", "de-en", "en"] as const;
export type Mode = (typeof MODES)[number];

export const MODE_COOKIE = "mcm-mode";

/** Ein Jahr: die Wahl ist eine Gewohnheit, keine Sitzungseinstellung. */
export const MODE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

/** Wie der Modus im Umschalter heißt — jeweils in seiner eigenen Sprache. */
export const MODE_NAMES: Record<Mode, string> = {
  de: "Deutsch",
  "de-en": "Deutsch, Regeln englisch",
  en: "English",
};

export function isMode(value: unknown): value is Mode {
  return typeof value === "string" && (MODES as readonly string[]).includes(value);
}

/**
 * Gewählter Modus, sonst die Browsersprache: Deutsch, wenn sie mit "de"
 * beginnt, sonst Englisch. Der gemischte Modus wird nie geraten — er ist
 * eine Vorliebe, die man nur selbst kennt.
 */
export function resolveMode(cookie: string | undefined, acceptLanguage: string | null): Mode {
  if (isMode(cookie)) return cookie;
  const first = (acceptLanguage ?? "").split(",")[0]?.trim().toLowerCase() ?? "";
  if (first === "" || first.startsWith("de")) return "de";
  return "en";
}

/** Sprache der Bedienung — der gemischte Modus bedient sich auf Deutsch. */
export function uiLanguage(mode: Mode): "de" | "en" {
  return mode === "en" ? "en" : "de";
}

/** Sprache der Regelbegriffe. */
export function termLanguage(mode: Mode): "de" | "en" {
  return mode === "de" ? "de" : "en";
}

/** Für Zahlen und `<html lang>`: die Bedienung bestimmt, nicht das Glossar. */
export function localeOf(mode: Mode): "de-DE" | "en-US" {
  return uiLanguage(mode) === "de" ? "de-DE" : "en-US";
}
