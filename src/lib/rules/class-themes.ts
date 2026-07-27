export type ClassTheme = {
  key: string;
  /**
   * Pfad relativ zu /public, z.B. "/class-backgrounds/wizard.jpg".
   * Fehlt der Eintrag für eine Klasse, hat sie (noch) kein Bild.
   */
  image: string;
};

/**
 * Nur Klassen mit tatsächlich vorhandener Bilddatei eintragen — die Bilder
 * kommen von Hand dazu (recherchiert oder KI-generiert), nicht automatisch
 * heruntergeladen. Bis dahin bleibt die Liste leer und der Hintergrund
 * unsichtbar, unabhängig vom Ein/Aus-Schalter.
 */
export const CLASS_THEMES: readonly ClassTheme[] = [];

const BY_KEY = new Map(CLASS_THEMES.map((t) => [t.key, t]));

/** Liefert das Hintergrundthema, oder undefined ohne hinterlegtes Bild. */
export function getClassTheme(key: string): ClassTheme | undefined {
  return BY_KEY.get(key);
}

export type ResolvedBackground =
  | { kind: "none" }
  | { kind: "single"; theme: ClassTheme }
  | { kind: "blend"; primary: ClassTheme; secondary: ClassTheme };

/**
 * Wählt bis zu zwei Themen aus den Klassen eines Charakters (höchste Stufe
 * zuerst). Bei drei oder mehr Klassen zählen nur die zwei höchststufigen —
 * eine Drei-Wege-Überblendung wäre am Tisch nicht mehr auseinanderzuhalten.
 * Klassen ohne Bild (Homebrew oder noch nicht eingepflegt) werden
 * übersprungen, nicht durch Ink ersetzt: zwei erkennbare Klassen sind
 * besser als eine erkennbare plus eine leere Fläche.
 */
export function resolveBackground(
  classes: readonly { classKey: string; level: number }[],
  // Austauschbar für Tests: die echte Bilder-Liste ist anfangs leer, die
  // Auswahllogik (Sortierung, Zweier-Limit, Skip bei fehlendem Bild) soll
  // trotzdem unabhängig davon geprüft werden können.
  lookup: (key: string) => ClassTheme | undefined = getClassTheme,
): ResolvedBackground {
  const themed = classes
    .map((c) => ({ level: c.level, theme: lookup(c.classKey) }))
    .filter((c): c is { level: number; theme: ClassTheme } => c.theme !== undefined)
    .sort((a, b) => b.level - a.level)
    .slice(0, 2);

  if (themed.length === 0) return { kind: "none" };
  if (themed.length === 1) return { kind: "single", theme: themed[0].theme };
  return { kind: "blend", primary: themed[0].theme, secondary: themed[1].theme };
}
