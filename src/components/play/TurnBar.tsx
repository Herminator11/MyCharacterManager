"use client";

import { ACTION_TONE, ActionShape, ChevronDownIcon } from "@/components/icons";
import { cx } from "@/components/ui";
import type { LiveMutation, LiveState } from "@/lib/live-types";
import { useT } from "@/lib/i18n/client";
import { ACTION_SLOTS, type ActionSlot } from "@/lib/rules/actions";

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
 * noch, was übrig ist. Die Bonusaktion war hier einmal Ember-Rot, die
 * Farbe von Schaden — sie hat ihr eigenes Orange bekommen.
 */
const SLOT_TONE = {
  action: { border: "border-patina-dim bg-patina-deep", text: ACTION_TONE.action },
  bonus: { border: "border-bonus-dim bg-bonus-deep", text: ACTION_TONE.bonus },
  reaction: { border: "border-brass/50 bg-brass/10", text: ACTION_TONE.reaction },
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
  const t = useT();
  const { turn } = state;
  const spent = ACTION_SLOTS.filter((slot) => turn[slot]).length;
  // Im Kampf schaltet "Zug beenden" auch die Runde weiter — das muss
  // gehen, wenn man den Zug ungenutzt verstreichen lässt. Gesperrt ist es
  // nur außerhalb, wo es allein die Konten zurücksetzt und es dann nichts
  // zurückzusetzen gibt.
  const canEnd = spent > 0 || state.round > 0;

  return (
    <section className="rounded-lg border border-edge bg-panel px-4 py-3">
      <div className="mb-2.5 flex items-baseline justify-between gap-3">
        <h2 className="label">{t.battle.turn}</h2>
        {/* min-h-11 mit negativem Rand: volles Tippziel, ohne die
            Kopfzeile aufzublähen. */}
        <button
          type="button"
          onClick={() => {
            send({ type: "turn.end" });
            onToggle(null);
          }}
          disabled={!canEnd}
          className="-my-3 inline-flex min-h-11 items-center text-xs text-mute transition-colors hover:text-patina disabled:opacity-40 disabled:hover:text-mute"
        >
          {t.battle.endTurn}
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
              // Form, Wort und Zustand übereinander statt nebeneinander:
              // "Bonusaktion" mit Dreieck und Chevron in einer Zeile ist
              // breiter als ein Drittel von 390 px und ragte über den
              // Rand. min-w-0 erlaubt der Grid-Spalte, kleiner als ihr
              // Inhalt zu werden; hyphens fängt noch schmalere Bildschirme.
              className={cx(
                "flex min-h-14 min-w-0 flex-col items-center justify-center gap-0.5 rounded-md border px-1.5 py-2 text-[0.8125rem] leading-tight font-medium transition-colors",
                used
                  ? "border-edge bg-ink text-faint"
                  : open
                    ? `${border} ${text} ring-1 ring-inset ring-current`
                    : `${border} ${text}`,
              )}
            >
              <ActionShape
                kind={slot}
                filled={!used}
                className="size-[1.05rem] shrink-0"
              />
              <span className="max-w-full text-center break-words hyphens-auto">
                {t.actionCost(slot)}
              </span>
              <span className="flex items-center gap-0.5 text-[0.625rem] font-normal tracking-wide uppercase">
                {used ? t.battle.used : t.battle.free}
                {!used ? (
                  <ChevronDownIcon
                    className={cx(
                      "size-3 transition-transform",
                      open && "rotate-180",
                    )}
                  />
                ) : null}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
