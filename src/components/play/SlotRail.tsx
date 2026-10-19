"use client";

import { cx, Ratio } from "@/components/ui";
import { useT } from "@/lib/i18n/client";

/**
 * Die Zauberplätze eines Grades als Reihe von Sockeln.
 *
 * Direkte Manipulation statt Dialog: der nächste freie Sockel verbraucht
 * sich beim Antippen, ein verbrauchter kommt beim Antippen zurück. Das ist
 * ein Tipper statt drei und deckt den häufigsten Fall am Tisch ab — den
 * geführten Weg über die Zauberliste gibt es trotzdem.
 *
 * Hellblaue Quadrate und römische Ziffern kommen aus Baldur's Gate: dort
 * stehen die Slots als eigene Farbe neben den Aktionen, weil sie etwas
 * anderes bedeuten als "verfügbar" oder "Gefahr" — nämlich Magie. Die
 * Ziffer sitzt links, die Zahl der leuchtenden Quadrate sagt den Rest.
 */

/** Grad 1 bis 9. Mehr gibt es in den Regeln nicht. */
const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX"];
export function SlotRail({
  level,
  total,
  used,
  onChange,
  tone = "arcane",
}: {
  level: number;
  total: number;
  used: number;
  onChange: (used: number) => void;
  tone?: "arcane" | "ember";
}) {
  const t = useT();
  const free = total - used;

  return (
    <div className="flex items-center gap-3">
      <span className="w-8 shrink-0 text-sm font-semibold tracking-wide text-mute">
        {ROMAN[level - 1] ?? level}
      </span>

      <div className="flex flex-wrap gap-1.5">
        {Array.from({ length: total }, (_, index) => {
          // Verbrauchte Sockel sitzen rechts, damit die freien immer links
          // stehen und man ihre Anzahl auf einen Blick abliest.
          const isFree = index < free;

          return (
            <button
              key={index}
              type="button"
              onClick={() => onChange(isFree ? used + 1 : used - 1)}
              aria-label={
                isFree
                  ? t.play.spendSlot(t.term.spellLevel(level))
                  : t.play.returnSlot(t.term.spellLevel(level))
              }
              className={cx(
                "socket",
                tone === "ember" ? "socket-ember" : "socket-arcane",
                isFree ? "socket-full" : "socket-spent",
              )}
            />
          );
        })}
      </div>

      <span className="ml-auto shrink-0 text-sm">
        <Ratio
          current={free}
          total={total}
          className={free > 0 ? "font-semibold text-fg" : "text-ember"}
        />
      </span>
    </div>
  );
}
