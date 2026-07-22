"use client";

import { cx } from "@/components/ui";
import { useLive } from "@/lib/live-context";

/**
 * Inspiration als Flamme — sie brennt oder sie brennt nicht.
 *
 * Die Form ist bewusst keine dritte Variante von Stern oder Blitz: der
 * Stern markiert auf der Startseite Favoriten, der Blitz steht neben der
 * Initiative. Drei ähnliche Zacken nebeneinander wären zum Verwechseln.
 *
 * Steht oben beim Charakter statt unten im Kampfblock, weil man
 * Inspiration nicht sucht, sondern sich an sie erinnern lassen muss —
 * genau deshalb verfällt sie am Tisch so oft ungenutzt.
 */
export function InspirationToggle() {
  const { state, send } = useLive();
  const on = state.inspiration;

  return (
    <button
      type="button"
      onClick={() => send({ type: "inspiration.set", value: !on })}
      aria-pressed={on}
      aria-label={
        on ? "Inspiration ausgeben" : "Inspiration erhalten"
      }
      title={on ? "Inspiration vorhanden — antippen zum Ausgeben" : "Keine Inspiration"}
      className="flex w-[4.5rem] shrink-0 flex-col items-center"
    >
      <span
        className={cx(
          "flex h-[3.75rem] w-full items-center justify-center rounded-lg border transition-colors",
          on
            ? "border-brass bg-brass/10 text-brass"
            : "border-edge bg-panel-2 text-faint hover:border-edge-bright hover:text-mute",
        )}
      >
        <FlameIcon lit={on} />
      </span>
      <span
        className={cx("label mt-1 text-[0.5625rem]", on && "text-brass")}
      >
        Inspiration
      </span>
    </button>
  );
}

/**
 * Zwei Pfade: der Umriss trägt die Form, der innere Kern das Leuchten.
 * Ungenutzt bleibt nur der Umriss stehen — dieselbe Sprache wie bei den
 * Zauberplätzen, wo verbraucht ein leeres Loch ist.
 */
function FlameIcon({ lit }: { lit: boolean }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="size-6">
      <path
        d="M12 2.5c3.4 3 5.5 5.6 5.5 8.9a5.5 5.5 0 1 1-11 0c0-1.7.7-3.2 1.9-4.6.3 1 .9 1.8 1.7 2.2.5-2.6.9-4.6 1.9-6.5z"
        fill={lit ? "var(--color-brass)" : "none"}
        fillOpacity={lit ? 0.18 : 0}
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      {lit ? (
        <path
          d="M12 12.2c1.5 1.3 2.3 2.4 2.3 3.7a2.3 2.3 0 1 1-4.6 0c0-1.3.8-2.4 2.3-3.7z"
          fill="var(--color-brass)"
        />
      ) : null}
    </svg>
  );
}
