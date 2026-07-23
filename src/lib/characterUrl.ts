/**
 * Vanity-Slug für Charakter-URLs: `/c/{id}-{slug}` statt der nackten ID.
 *
 * Geparst wird beim Aufruf nur die führende Zahl vor dem ersten Bindestrich
 * — der Rest ist reine Lesbarkeit fürs Auge und für Lesezeichen. Ein alter
 * Link mit veraltetem Namen (nach einer Umbenennung) bricht deshalb nicht:
 * die Zahl zeigt immer noch auf den richtigen Charakter. Keine Server-Only-
 * Abhängigkeit, weil sowohl Server-Actions (redirect) als auch Client-
 * Komponenten (Link, router.push) diese Funktionen brauchen.
 */

const COMBINING_MARKS = /[̀-ͯ]/g;

export function slugifyCharacterName(name: string): string {
  return name
    .normalize("NFKD")
    .replace(COMBINING_MARKS, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

export function characterPath(id: number, name: string, suffix = ""): string {
  const slug = slugifyCharacterName(name);
  return slug ? `/c/${id}-${slug}${suffix}` : `/c/${id}${suffix}`;
}

/** Verzeiht auch einen nackten `/c/5`-Link ohne Slug — parseInt bricht bei "5". */
export function characterIdFromParam(param: string): number {
  return parseInt(param, 10);
}
