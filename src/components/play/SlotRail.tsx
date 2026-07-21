"use client";

import { cx } from "@/components/ui";

/**
 * Die Zauberplätze eines Grades als Reihe von Sockeln.
 *
 * Direkte Manipulation statt Dialog: der nächste freie Sockel verbraucht
 * sich beim Antippen, ein verbrauchter kommt beim Antippen zurück. Das ist
 * ein Tipper statt drei und deckt den häufigsten Fall am Tisch ab — den
 * geführten Weg über die Zauberliste gibt es trotzdem.
 */
export function SlotRail({
  level,
  total,
  used,
  onChange,
  tone = "patina",
}: {
  level: number;
  total: number;
  used: number;
  onChange: (used: number) => void;
  tone?: "patina" | "ember";
}) {
  const free = total - used;

  return (
    <div className="flex items-center gap-3">
      <span className="w-8 shrink-0 text-sm font-semibold text-mute">
        {level}.
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
                  ? `Zauberplatz Grad ${level} verbrauchen`
                  : `Zauberplatz Grad ${level} zurückgeben`
              }
              className={cx(
                "socket",
                tone === "ember" && "socket-ember",
                isFree ? "socket-full" : "socket-spent",
              )}
            />
          );
        })}
      </div>

      <span className="ml-auto shrink-0 text-sm tracking-tight text-faint">
        <span className={free > 0 ? "text-fg" : "text-ember"}>{free}</span>
        <span className="text-faint">/{total}</span>
      </span>
    </div>
  );
}
