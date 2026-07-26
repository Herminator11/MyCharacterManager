"use client";

import { ActionShape, ChevronDownIcon } from "@/components/icons";
import { cx } from "@/components/ui";
import type { LiveMutation, LiveState } from "@/lib/live-types";
import { ACTION_SLOTS, ACTION_LABELS, type ActionSlot } from "@/lib/rules/actions";

/**
 * Was im laufenden Zug noch übrig ist.
 *
 * Am Tisch ist "was kann ich noch machen?" die Frage, die man nicht
 * nachschlagen kann — sie steht auf keinem Bogen, weil sie sich jede Runde
 * ändert. Deshalb in einer Form, die man ohne Lesen erfasst — dieselbe
 * wie in Baldur's Gate: grüner Kreis für die Aktion, oranges Dreieck für
 * die Bonusaktion. Volle Form heißt frei, Umriss heißt verbraucht.
 *
 * Die Reaktion hat dort kein eigenes Zeichen. Sie bekommt hier die Raute
 * in Messing, weil sie zwischen den Zügen liegt und zu keinem der beiden
 * anderen gehört.
 *
 * Bewegung wird bewusst nicht mitgezählt. Fuß für Fuß nachzutippen, was
 * die Figur auf der Battlemap läuft, wäre Buchhaltung statt Hilfe — und
 * die Battlemap zeigt es ohnehin.
 *
 * Die App zählt mit, sie entscheidet nicht. Sie weiß nicht, ob du gerade
 * angegriffen hast — du sagst es ihr, mit einem Tipp.
 */
/**
 * Farbe gehört zur Form: Grün heißt "das Große geht noch", Orange "nur
 * noch das Kleine". Verbraucht ist alles gleich grau — dann zählt nur
 * noch, was übrig ist.
 */
const SLOT_TONE = {
  action: { border: "border-patina-dim bg-patina-deep", text: "text-patina" },
  bonus: { border: "border-ember-dim bg-ember-deep", text: "text-ember" },
  reaction: { border: "border-brass/50 bg-brass/10", text: "text-brass" },
} as const;

export function TurnBar({
  state,
  send,
  expanded,
  onToggle,
}: {
  state: LiveState;
  send: (mutation: LiveMutation) => void;
  /** Welches Konto gerade seine Optionen darunter zeigt. */
  expanded: ActionSlot | null;
  onToggle: (slot: ActionSlot | null) => void;
}) {
  const { turn } = state;
  const spent = ACTION_SLOTS.filter((slot) => turn[slot]).length;

  return (
    <section className="rounded-lg border border-edge bg-panel px-4 py-3">
      <div className="mb-2.5 flex items-baseline justify-between gap-3">
        <h2 className="label">Zug</h2>
        <button
          type="button"
          onClick={() => {
            send({ type: "turn.end" });
            onToggle(null);
          }}
          disabled={spent === 0}
          className="text-[0.6875rem] text-faint transition-colors hover:text-patina disabled:opacity-40 disabled:hover:text-faint"
        >
          Zug beenden
        </button>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {ACTION_SLOTS.map((slot) => {
          const used = turn[slot];
          const open = expanded === slot;
          const { border, text } = SLOT_TONE[slot];

          return (
            <button
              key={slot}
              type="button"
              // Frei: der Tipp klappt auf, was für dieses Konto noch bereit
              // liegt — Zauber und Waffen, ohne erst den Reiter zu wechseln.
              // Verbraucht: der Tipp gibt das Konto zurück, wie bisher; da
              // gibt es nichts mehr aufzuklappen.
              onClick={() =>
                used
                  ? send({ type: "turn.set", slot, used: false })
                  : onToggle(open ? null : slot)
              }
              aria-pressed={used}
              aria-expanded={!used ? open : undefined}
              className={cx(
                "flex min-h-14 flex-col items-center justify-center gap-1 rounded-md border px-2 text-sm font-medium transition-colors",
                used
                  ? "border-edge bg-ink text-faint"
                  : open
                    ? `${border} ${text} ring-1 ring-inset ring-current`
                    : `${border} ${text}`,
              )}
            >
              <span className="flex items-center gap-1.5">
                <ActionShape
                  kind={slot}
                  filled={!used}
                  className="size-[1.05rem]"
                />
                {ACTION_LABELS[slot]}
                {!used ? (
                  <ChevronDownIcon
                    className={cx(
                      "size-3 transition-transform",
                      open && "rotate-180",
                    )}
                  />
                ) : null}
              </span>
              <span className="text-[0.625rem] font-normal tracking-wide uppercase">
                {used ? "verbraucht" : "frei"}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
