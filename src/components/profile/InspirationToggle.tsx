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
 * Steht neben dem Namen statt in der Instrumentenreihe rechts:
 * Inspiration ist kein Kampfwert wie AC oder Speed, den man nachschlägt —
 * es ist ein Zustand, an den man sich erinnern lassen muss. Ein eigener
 * Platz tut das, ohne um Aufmerksamkeit mit den Instrumenten zu
 * konkurrieren, die man am Tisch tatsächlich vorliest.
 */
export function InspirationToggle({ className }: { className?: string }) {
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
      className={cx(
        "flex size-10 items-center justify-center transition-colors",
        on ? "text-brass" : "text-faint hover:text-mute",
        className,
      )}
    >
      <FlameIcon lit={on} />
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
    <svg viewBox="0 0 24 24" aria-hidden className="size-7">
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
