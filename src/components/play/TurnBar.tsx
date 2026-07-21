"use client";

import { cx } from "@/components/ui";
import type { LiveMutation, LiveState } from "@/lib/live-types";
import { ACTION_SLOTS, ACTION_LABELS } from "@/lib/rules/actions";

/**
 * Was im laufenden Zug noch übrig ist.
 *
 * Am Tisch ist "was kann ich noch machen?" die Frage, die man nicht
 * nachschlagen kann — sie steht auf keinem Bogen, weil sie sich jede Runde
 * ändert. Deshalb ganz oben und in einer Form, die man ohne Lesen erfasst:
 * hell heißt frei, dunkel heißt weg.
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
  const moveLeft = Math.max(0, turn.speed - turn.movementUsed);

  return (
    <section className="rounded-lg border border-edge bg-panel px-4 py-3">
      <div className="mb-2.5 flex items-baseline justify-between gap-3">
        <h2 className="label">Zug</h2>
        <button
          type="button"
          onClick={() => send({ type: "turn.end" })}
          disabled={spent === 0 && turn.movementUsed === 0}
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

      <Movement
        used={turn.movementUsed}
        speed={turn.speed}
        left={moveLeft}
        onChange={(used) => send({ type: "turn.move", used })}
      />
    </section>
  );
}

/**
 * Bewegung in Fünf-Fuß-Schritten — ein Feld auf der Battlemap. Wer anders
 * zählt, tippt auf die Zahl und schreibt sie hin.
 */
function Movement({
  used,
  speed,
  left,
  onChange,
}: {
  used: number;
  speed: number;
  left: number;
  onChange: (used: number) => void;
}) {
  const fields = Math.round(speed / 5);

  return (
    <div className="mt-3 flex items-center gap-3">
      <span className="label shrink-0">Bewegung</span>

      <div className="flex min-w-0 flex-1 flex-wrap gap-1">
        {Array.from({ length: fields }, (_, index) => {
          // Verbrauchte Felder sitzen rechts, wie bei den Zauberplätzen.
          const isFree = index < fields - Math.round(used / 5);
          return (
            <button
              key={index}
              type="button"
              onClick={() =>
                onChange(isFree ? used + 5 : Math.max(0, used - 5))
              }
              aria-label={`${(index + 1) * 5} Fuß`}
              className={cx(
                "h-5 flex-1 rounded-xs transition-colors",
                isFree ? "bg-patina-dim" : "bg-ink",
              )}
            />
          );
        })}
      </div>

      <span className="shrink-0 text-sm tabular-nums">
        <span className={left > 0 ? "font-semibold" : "text-faint"}>{left}</span>
        <span className="text-faint"> ft</span>
      </span>
    </div>
  );
}
