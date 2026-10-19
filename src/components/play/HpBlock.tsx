"use client";

import { useEffect, useState } from "react";

import { BurstIcon, HeartIcon, PlusIcon, SkullIcon } from "@/components/icons";
import { Button, cx } from "@/components/ui";
import type { LiveMutation, LiveState } from "@/lib/live-types";
import { deathStatus, type DeathStatus } from "@/lib/rules/hp";

/**
 * Trefferpunkte — der meistbenutzte Block der ganzen App.
 *
 * Aufgebaut für den Ablauf am Tisch: Schaden ansagen, eintippen, weiter.
 * Der große Balken ist aus zwei Metern Entfernung lesbar, die Schnelltasten
 * decken die üblichen Beträge ab, das Feld dazwischen den Rest.
 */
export function HpBlock({
  state,
  send,
}: {
  state: LiveState;
  send: (mutation: LiveMutation) => void;
}) {
  const [amount, setAmount] = useState("");

  const ratio = state.hpMax > 0 ? state.hpCurrent / state.hpMax : 0;
  const down = state.hpCurrent === 0;
  const status = deathStatus(state);
  const tone = down ? "text-ember" : ratio <= 0.5 ? "text-brass" : "text-patina";

  const applyTyped = (sign: 1 | -1) => {
    const value = Number(amount);
    if (!Number.isFinite(value) || value === 0) return;
    send({ type: "hp.delta", amount: sign * Math.abs(value) });
    setAmount("");
  };

  return (
    <section className="rounded-lg border border-edge bg-panel px-4 py-4">
      <div className="flex items-end justify-between gap-4">
        <div>
          {/* Das Herz nimmt die Farbe des Standes an — wer nur hinschaut,
              sieht schon an ihm, wie es steht. */}
          <p className="label flex items-center gap-1.5">
            <HeartIcon className={tone} />
            Trefferpunkte
          </p>
          <p className="mt-1 flex items-baseline gap-1.5">
            <span
              className={cx(
                "font-numeral text-[2.75rem] leading-none font-semibold",
                down ? "text-ember" : ratio <= 0.5 ? "text-brass" : "text-fg",
              )}
            >
              {state.hpCurrent}
            </span>
            <span className="text-lg text-faint">/ {state.hpMax}</span>
          </p>
        </div>

        <TempHp value={state.hpTemp} send={send} />
      </div>

      <div className="mt-3 h-2 overflow-hidden rounded-full bg-ink">
        <div
          className={cx(
            "h-full rounded-full transition-[width] duration-200",
            down ? "bg-ember" : ratio <= 0.5 ? "bg-brass" : "bg-patina",
          )}
          style={{ width: `${Math.max(0, Math.min(1, ratio)) * 100}%` }}
        />
      </div>

      {/* Ein Weg statt zweier: Betrag eintippen, Richtung wählen. Der
          Schaden am Tisch ist ohnehin nie −5, sondern 13. */}
      <div className="mt-4 grid grid-cols-3 gap-2">
        <input
          type="number"
          inputMode="numeric"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") applyTyped(-1);
          }}
          placeholder="Betrag"
          aria-label="Betrag für Schaden oder Heilung"
          className="min-w-0 min-h-12 rounded-md border border-edge bg-ink px-2 text-center text-lg font-semibold text-fg placeholder:text-base placeholder:font-normal placeholder:text-faint focus:border-patina focus:outline-none"
        />
        <Button variant="danger" className="gap-1.5 px-2" onClick={() => applyTyped(-1)}>
          <BurstIcon />
          Schaden
        </Button>
        <Button variant="heal" className="gap-1.5 px-2" onClick={() => applyTyped(1)}>
          <PlusIcon />
          Heilung
        </Button>
      </div>

      {status !== "alive" ? (
        <DeathSaves status={status} state={state} send={send} />
      ) : null}
    </section>
  );
}

function TempHp({
  value,
  send,
}: {
  value: number;
  send: (mutation: LiveMutation) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value));

  useEffect(() => {
    if (!editing) setDraft(String(value));
  }, [value, editing]);

  const commit = () => {
    setEditing(false);
    const next = Number(draft);
    if (Number.isFinite(next) && next !== value) {
      send({ type: "hp.temp", value: next });
    }
  };

  if (editing) {
    return (
      <div className="text-right">
        <p className="label">Temp</p>
        <input
          autoFocus
          type="number"
          inputMode="numeric"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={commit}
          onKeyDown={(event) => {
            if (event.key === "Enter") commit();
            if (event.key === "Escape") setEditing(false);
          }}
          className="mt-1 w-20 rounded-md border border-patina bg-ink px-2 py-1 text-right text-xl font-semibold focus:outline-none"
        />
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      className="rounded-md px-2 py-1 text-right transition-colors hover:bg-panel-2"
    >
      <span className="label">Temp</span>
      <span
        className={cx(
          "mt-1 block text-xl leading-none font-semibold",
          value > 0 ? "text-brass" : "text-faint",
        )}
      >
        {value > 0 ? `+${value}` : "—"}
      </span>
    </button>
  );
}

/**
 * Was bei 0 Trefferpunkten passiert.
 *
 * Drei Zustände statt einem, weil die Regeln drei kennen: Man würfelt,
 * man ist stabil, oder man ist tot. Die App zählt die Würfe nicht selbst —
 * sie merkt sich, was du eingetragen hast, und sagt, was daraus folgt.
 * Das ist genau die Stelle, an der man am Tisch durcheinanderkommt:
 * mitten in der Panik zählt niemand mit, wie viele Häkchen schon stehen.
 */
function DeathSaves({
  status,
  state,
  send,
}: {
  status: DeathStatus;
  state: LiveState;
  send: (mutation: LiveMutation) => void;
}) {
  if (status === "dead") {
    return (
      <div className="mt-4 rounded-md border border-ember bg-ember-deep px-3.5 py-3">
        <p className="flex items-center gap-2 text-sm font-semibold text-ember">
          <SkullIcon className="size-4" />
          Tot — drei Fehlschläge
        </p>
        <p className="mt-1.5 text-xs text-mute">
          Von hier führt kein Wurf mehr zurück, nur noch Revivify, Raise Dead
          oder ein Wunsch. Jede Heilung über 0 HP hebt das hier auf.
        </p>
        <button
          type="button"
          onClick={() =>
            send({ type: "death.set", successes: 0, failures: 2 })
          }
          className="mt-2 min-h-11 text-xs text-faint transition-colors hover:text-patina"
        >
          Einen Fehlschlag zurücknehmen
        </button>
      </div>
    );
  }

  if (status === "stable") {
    return (
      <div className="mt-4 rounded-md border border-patina-dim bg-patina-deep px-3.5 py-3">
        <p className="text-sm font-semibold text-patina">
          Stabil — keine Würfe mehr
        </p>
        <p className="mt-1.5 text-xs text-mute">
          Bewusstlos bei 0 HP, aber außer Gefahr. Nach 1W4 Stunden wachst du
          mit 1 HP auf; Schaden wirft dich zurück ins Sterben.
        </p>
        <button
          type="button"
          onClick={() =>
            send({ type: "death.set", successes: 2, failures: 0 })
          }
          className="mt-2 min-h-11 text-xs text-faint transition-colors hover:text-patina"
        >
          Doch nicht stabil
        </button>
      </div>
    );
  }

  return <DyingSaves state={state} send={send} />;
}

/**
 * Drei Erfolge stabilisieren, drei Fehlschläge töten — beides passiert
 * beim Antippen des dritten Kreises, ohne Rückfrage. Ein Zwischenschritt
 * wäre hier falsch: der Wurf ist längst gefallen, die App trägt nur ein.
 *
 * Bewusst rund, damit man sie im Eifer des Gefechts nie mit den eckigen
 * Zauberplätzen verwechselt.
 */
function DyingSaves({
  state,
  send,
}: {
  state: LiveState;
  send: (mutation: LiveMutation) => void;
}) {
  const row = (
    label: string,
    filled: number,
    tone: "patina" | "ember",
    set: (next: number) => void,
  ) => (
    <div className="flex items-center gap-3">
      <span className="label w-20">{label}</span>
      <div className="flex gap-2">
        {[1, 2, 3].map((step) => (
          <button
            key={step}
            type="button"
            // Nochmal auf den letzten gefüllten tippen nimmt ihn zurück.
            onClick={() => set(filled === step ? step - 1 : step)}
            aria-label={`${label} ${step}`}
            aria-pressed={step <= filled}
            className={cx(
              "socket socket-round",
              tone === "ember" && "socket-ember",
              step <= filled ? "socket-full" : "socket-spent",
            )}
          />
        ))}
      </div>
    </div>
  );

  return (
    <div className="mt-4 space-y-2.5 rounded-md border border-ember-dim bg-ember-deep/40 px-3.5 py-3">
      <p className="flex items-center gap-2 text-sm font-semibold text-ember">
        <SkullIcon className="size-4" />
        Bewusstlos — Todesrettungswürfe
      </p>
      {row("Erfolge", state.deathSaveSuccesses, "patina", (successes) =>
        send({
          type: "death.set",
          successes,
          failures: state.deathSaveFailures,
        }),
      )}
      {row("Fehlschläge", state.deathSaveFailures, "ember", (failures) =>
        send({
          type: "death.set",
          successes: state.deathSaveSuccesses,
          failures,
        }),
      )}
    </div>
  );
}
