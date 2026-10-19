/**
 * Zerlegt den Schadenstext eines Bogens ("1d8+3 piercing") in die drei
 * Felder, die ein Angriff getrennt führt.
 *
 * Getrennt werden muss, weil die Anzeige den Bonus selbst anhängt: Stünde
 * der ganze Text in `damageDice` und bliebe der Bonus `null`, käme der
 * Attributsmodifikator ein zweites Mal dazu ("1d8+3 piercing+3").
 *
 * Zerlegt wird nur, was eindeutig ist: genau ein Würfelausdruck, höchstens
 * ein fester Bonus, danach höchstens ein Wort als Schadensart (ein
 * nachgestelltes "damage"/"Schaden" darf dabeistehen). Alles andere —
 * "2d10 +5 force damage per beam", "1d8 (1d10 two-handed)", "siehe
 * Notizen" — bleibt als Text stehen, mit Bonus 0. Raten wäre schlimmer als
 * ein ungeteilter Text: der Bonus stünde ja schon darin.
 */
export type ParsedDamage = {
  dice: string;
  /** Fester Bonus laut Bogen; 0, wenn keiner dasteht oder nicht zerlegt wurde. */
  bonus: number;
  type: string;
};

const PATTERN =
  /^(\d*)[dD](\d+)\s*(?:([+\-−–])\s*(\d+))?(?:\s+([\p{L}]+)(?:\s+(?:damage|schaden))?)?$/iu;

export function parseDamage(raw: string): ParsedDamage {
  const text = raw.trim();
  const match = PATTERN.exec(text);

  // Kein Bonus im Text heißt beim Import nicht "Attribut einsetzen": der
  // Bogen ist die Quelle, wie beim Angriffsbonus. Deshalb 0 statt null —
  // auch für leere Felder, sonst stünde bei einem Zauber ohne Effekttext
  // plötzlich der STR-Modifikator.
  if (!match) return { dice: text, bonus: 0, type: "" };

  const [, count, sides, sign, amount, type] = match;
  const bonus = amount ? Number(amount) * (sign === "+" ? 1 : -1) : 0;

  return { dice: `${count || "1"}d${sides}`, bonus, type: type ?? "" };
}
