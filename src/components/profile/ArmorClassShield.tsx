"use client";

import { useState, useTransition } from "react";

import { cx, PenIcon } from "@/components/ui";

/**
 * Die Rüstungsklasse — ablesbar wie bisher, änderbar per Tipp.
 *
 * Das Schild bleibt dabei stehen. Es aufzuklappen oder gegen ein
 * Formularfeld zu tauschen hieße, genau das Ding zu verlieren, das man aus
 * zwei Metern findet: die Zahl wechselt in ein Eingabefeld an derselben
 * Stelle, in derselben Größe, im selben Rahmen.
 *
 * Leeres Feld heißt „wieder berechnen“ — dieselbe Regel wie im Bogen. Eine
 * AC von +2 durch Shield of Faith trägt man ein und nimmt sie hinterher
 * ebenso schnell zurück.
 */
export function ArmorClassShield({
  value,
  override,
  save,
}: {
  /** Der geltende Wert — berechnet oder überschrieben. */
  value: number;
  /** Der gesetzte Wert, falls einer gesetzt ist. */
  override: number | null;
  save: (value: number | null) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState("");
  const [pending, startTransition] = useTransition();

  const open = () => {
    // Ein gesetzter Wert steht schon da und lässt sich überschreiben; ein
    // berechneter bleibt leer, damit man ihn nicht versehentlich festnagelt.
    setText(override === null ? "" : String(override));
    setEditing(true);
  };

  const commit = () => {
    setEditing(false);

    const raw = text.trim();
    const next = raw === "" ? null : Number(raw);
    if (next !== null && !Number.isFinite(next)) return;
    if (next === override) return;

    startTransition(() => void save(next));
  };

  return (
    <div
      className={cx(
        "group relative flex w-[4.5rem] shrink-0 flex-col items-center transition-opacity",
        pending && "opacity-60",
      )}
    >
      <svg
        viewBox="0 0 44 50"
        aria-hidden
        className={cx(
          "h-[3.75rem] w-auto transition-colors",
          editing ? "text-patina" : "text-patina-dim group-hover:text-patina",
        )}
      >
        <path
          d="M22 2 L41 8.5 V25 C41 37 32.5 44.5 22 48 C11.5 44.5 3 37 3 25 V8.5 Z"
          fill="var(--color-panel-2)"
          stroke="currentColor"
          strokeWidth="1.5"
        />
      </svg>

      {/* Zahl wie Feld sitzen an derselben Stelle: in der breiten oberen
          Hälfte, damit nichts an der schrägen Flanke klebt. */}
      {editing ? (
        <input
          autoFocus
          type="number"
          inputMode="numeric"
          aria-label="Rüstungsklasse"
          value={text}
          onChange={(event) => setText(event.target.value)}
          onFocus={(event) => event.target.select()}
          onBlur={commit}
          onKeyDown={(event) => {
            if (event.key === "Enter") event.currentTarget.blur();
            if (event.key === "Escape") setEditing(false);
          }}
          className="absolute top-[0.8rem] w-11 border-0 bg-transparent p-0 text-center text-[1.375rem] leading-none font-semibold tabular-nums focus:outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
        />
      ) : (
        <button
          type="button"
          onClick={open}
          title="Rüstungsklasse ändern"
          className="absolute top-[0.8rem] w-11 py-0.5 text-center text-[1.375rem] leading-none font-semibold tabular-nums"
        >
          {value}
        </button>
      )}

      <dt className="label mt-1 flex items-center gap-1 text-[0.5625rem]">
        {editing ? (
          // Sagt in dem Moment, in dem die Frage aufkommt, was ein leeres
          // Feld bedeutet — statt in einem Hilfetext, den niemand liest.
          <span className="normal-case tracking-normal text-faint">
            leer = auto
          </span>
        ) : (
          <>
            AC
            <PenIcon className="size-2.5 text-faint transition-colors group-hover:text-patina" />
          </>
        )}
      </dt>
    </div>
  );
}
