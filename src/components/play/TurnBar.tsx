"use client";

import { cx } from "@/components/ui";
import type { LiveMutation, LiveState } from "@/lib/live-types";
import { ACTION_SLOTS, ACTION_LABELS } from "@/lib/rules/actions";

/**
 * Was im laufenden Zug noch übrig ist.
 *
 * Am Tisch ist "was kann ich noch machen?" die Frage, die man nicht
 * nachschlagen kann — sie steht auf keinem Bogen, weil sie sich jede Runde
 * ändert. Deshalb in einer Form, die man ohne Lesen erfasst: hell heißt
 * frei, dunkel heißt weg.
 *
 * Bewegung wird bewusst nicht mitgezählt. Fuß für Fuß nachzutippen, was
 * die Figur auf der Battlemap läuft, wäre Buchhaltung statt Hilfe — und
 * die Battlemap zeigt es ohnehin.
 *
 * Die App zählt mit, sie entscheidet nicht. Sie weiß nicht, ob du gerade
 * angegriffen hast — du sagst es ihr, mit einem Tipp.
 */
export function TurnBar({
  state,
  send,
}: {
  state: LiveState;
  send: (mutation: LiveMutation) => void;
}) {
  const { turn } = state;
  const spent = ACTION_SLOTS.filter((slot) => turn[slot]).length;

  return (
    <section className="rounded-lg border border-edge bg-panel px-4 py-3">
      <div className="mb-2.5 flex items-baseline justify-between gap-3">
        <h2 className="label">Zug</h2>
        <button
          type="button"
          onClick={() => send({ type: "turn.end" })}
          disabled={spent === 0}
          className="text-[0.6875rem] text-faint transition-colors hover:text-patina disabled:opacity-40 disabled:hover:text-faint"
        >
          Zug beenden
        </button>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {ACTION_SLOTS.map((slot) => {
          const used = turn[slot];
          return (
            <button
              key={slot}
              type="button"
              onClick={() => send({ type: "turn.set", slot, used: !used })}
              aria-pressed={used}
              className={cx(
                "min-h-14 rounded-md border px-2 text-sm font-medium transition-colors",
                used
                  ? "border-edge bg-ink text-faint"
                  : "border-patina-dim bg-patina-deep text-patina",
              )}
            >
              {ACTION_LABELS[slot]}
              <span className="mt-0.5 block text-[0.625rem] font-normal tracking-wide uppercase">
                {used ? "verbraucht" : "frei"}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
