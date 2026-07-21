/**
 * Aktionsökonomie.
 *
 * Ein Zug in 5e hat vier Konten: Aktion, Bonusaktion, Reaktion, Bewegung.
 * Was davon noch frei ist, ist am Tisch die Frage, die am häufigsten
 * untergeht — und die einzige, die man nicht auf dem Bogen nachschlagen
 * kann, weil sie sich jede Runde ändert.
 *
 * Die Datei ist rein und importiert nichts aus `@/db`: Server und Browser
 * leiten beide daraus ab.
 */

export const ACTION_COSTS = ["action", "bonus", "reaction", "long"] as const;
export type ActionCost = (typeof ACTION_COSTS)[number];

export const ACTION_SLOTS = ["action", "bonus", "reaction"] as const;
export type ActionSlot = (typeof ACTION_SLOTS)[number];

export const ACTION_LABELS: Record<ActionCost, string> = {
  action: "Aktion",
  bonus: "Bonusaktion",
  reaction: "Reaktion",
  long: "Länger",
};

/**
 * Liest die Wirkzeit eines Zaubers als Aktionskosten.
 *
 * Der SRD schreibt sie als Freitext: "1 action", "1 bonus action",
 * "1 reaction, which you take when…", "10 minutes". Die Reihenfolge der
 * Prüfungen ist entscheidend — "1 bonus action" enthält das Wort "action"
 * und würde sonst als volle Aktion durchgehen.
 *
 * Alles, was länger als eine Runde dauert, wird zu `long`: im Kampf spielt
 * es keine Rolle, ob zehn Minuten oder acht Stunden.
 */
export function parseActionCost(castingTime: string): ActionCost {
  const text = castingTime.toLowerCase();

  if (text.includes("bonus")) return "bonus";
  if (text.includes("reaction") || text.includes("reaktion")) return "reaction";
  if (text.includes("action") || text.includes("aktion")) return "action";
  return "long";
}

/** Nur die drei Kosten, die ein Konto im Zug belasten. */
export function isSlotCost(cost: ActionCost): cost is ActionSlot {
  return cost !== "long";
}
