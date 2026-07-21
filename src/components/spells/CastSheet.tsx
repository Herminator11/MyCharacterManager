"use client";

import { useEffect, useState } from "react";

import { Button, cx } from "@/components/ui";
import type { LiveMutation, LiveState } from "@/lib/live-types";

export type CastableSpell = {
  id: number;
  name: string;
  level: number;
  school: string;
  castingTime: string;
  range: string;
  components: string;
  duration: string;
  concentration: boolean;
  ritual: boolean;
  description: string;
  higherLevel: string;
  /** JSON-Objekt Grad → Schadenswürfel, falls der Zauber skaliert. */
  damageAtSlotLevel: string;
  damageType: string;
};

/**
 * Der Cast-Dialog.
 *
 * Aufgebaut nach der Kernanforderung: Zauber antippen, Mindestgrad ist
 * vorausgewählt, jeder Pool mit freiem Slot dieses Grades ist ein großer
 * Knopf. Höhere Grade stehen darunter — mitsamt dem, was das Hochwirken
 * tatsächlich bringt, damit man die Entscheidung treffen kann, ohne im
 * Regelwerk nachzuschlagen.
 */
export function CastSheet({
  spell,
  state,
  onCast,
  onClose,
}: {
  spell: CastableSpell;
  state: LiveState;
  onCast: (mutation: LiveMutation) => void;
  onClose: () => void;
}) {
  const isCantrip = spell.level === 0;
  const [level, setLevel] = useState(Math.max(spell.level, 1));

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const damage = parseDamage(spell.damageAtSlotLevel);

  /** Grade, die mindestens ein Pool überhaupt anbietet. */
  const availableLevels = Array.from(
    new Set(
      state.pools.flatMap((pool) =>
        pool.slots.filter((s) => s.total > 0 && s.level >= spell.level).map((s) => s.level),
      ),
    ),
  ).sort((a, b) => a - b);

  const poolsAtLevel = state.pools
    .map((pool) => {
      const slot = pool.slots.find((s) => s.level === level);
      return slot && slot.total > 0
        ? { pool, free: slot.total - slot.used, total: slot.total }
        : null;
    })
    .filter((entry) => entry !== null);

  const cast = (poolId: number | null) => {
    onCast({
      type: "cast",
      poolId,
      level: poolId === null ? 0 : level,
      spellId: spell.id,
      spellName: spell.name,
      concentration: spell.concentration,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center">
      <button
        type="button"
        aria-label="Schließen"
        onClick={onClose}
        className="absolute inset-0 bg-ink/80 backdrop-blur-sm"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={`${spell.name} wirken`}
        className="relative max-h-[88vh] w-full max-w-2xl overflow-y-auto rounded-t-2xl border-t border-edge-bright bg-panel"
        style={{ paddingBottom: "max(env(safe-area-inset-bottom), 1rem)" }}
      >
        <div className="sticky top-0 border-b border-edge bg-panel px-5 pt-4 pb-3">
          <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-edge-bright" />
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-xl leading-tight font-semibold tracking-tight">
                {spell.name}
              </h2>
              <p className="mt-1 text-xs text-mute">
                {isCantrip ? "Cantrip" : `Grad ${spell.level}`}
                {spell.school ? ` · ${spell.school}` : ""}
                {spell.ritual ? " · Ritual" : ""}
                {spell.concentration ? " · Konzentration" : ""}
              </p>
            </div>
            <Button size="sm" variant="ghost" onClick={onClose}>
              Schließen
            </Button>
          </div>
        </div>

        <div className="px-5 py-4">
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2.5 text-sm sm:grid-cols-4">
            <Detail label="Wirkzeit" value={spell.castingTime} />
            <Detail label="Reichweite" value={spell.range} />
            <Detail label="Dauer" value={spell.duration} />
            <Detail label="Komponenten" value={spell.components} />
          </dl>

          {spell.concentration && state.concentration ? (
            <p className="mt-4 rounded-md border border-brass/50 bg-brass/10 px-3 py-2.5 text-sm text-brass">
              Ersetzt die laufende Konzentration auf{" "}
              <span className="font-semibold">
                {state.concentration.label || "einen anderen Zauber"}
              </span>
              .
            </p>
          ) : null}

          <div className="mt-5">
            {isCantrip ? (
              <>
                <p className="label mb-2">Cantrip — kein Zauberplatz nötig</p>
                <Button
                  variant="solid"
                  size="lg"
                  className="w-full"
                  onClick={() => cast(null)}
                >
                  Wirken
                </Button>
              </>
            ) : availableLevels.length === 0 ? (
              <p className="rounded-md border border-edge bg-ink px-3 py-3 text-sm text-mute">
                Für Grad {spell.level} hast du keinen Pool mit passenden
                Zauberplätzen. Über den Charakterbogen lässt sich einer anlegen.
              </p>
            ) : (
              <>
                <p className="label mb-2">Mit welchem Grad wirken?</p>
                <div className="flex flex-wrap gap-1.5">
                  {availableLevels.map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setLevel(option)}
                      aria-pressed={option === level}
                      className={cx(
                        "min-h-11 min-w-11 rounded-md border px-3 text-sm font-semibold transition-colors",
                        option === level
                          ? "border-patina bg-patina text-ink"
                          : "border-edge bg-panel-2 text-mute hover:border-edge-bright hover:text-fg",
                      )}
                    >
                      {option}
                      {option > spell.level ? (
                        <span className="ml-1 text-[0.625rem] font-normal opacity-70">
                          hoch
                        </span>
                      ) : null}
                    </button>
                  ))}
                </div>

                {level > spell.level ? (
                  <div className="mt-3 rounded-md border border-edge bg-ink px-3 py-2.5">
                    <p className="label">Hochgewirkt auf Grad {level}</p>
                    {damage[level] ? (
                      <p className="mt-1.5 text-sm">
                        Schaden{" "}
                        <span className="font-semibold text-patina">
                          {damage[level]}
                        </span>
                        {spell.damageType ? (
                          <span className="text-mute"> {spell.damageType}</span>
                        ) : null}
                        {damage[spell.level] ? (
                          <span className="text-faint">
                            {" "}
                            (statt {damage[spell.level]})
                          </span>
                        ) : null}
                      </p>
                    ) : null}
                    {spell.higherLevel ? (
                      <p className="mt-1.5 text-xs leading-relaxed text-mute">
                        {spell.higherLevel}
                      </p>
                    ) : null}
                  </div>
                ) : null}

                <p className="label mt-4 mb-2">Aus welchem Pool?</p>
                <div className="space-y-2">
                  {poolsAtLevel.map(({ pool, free, total }) => (
                    <Button
                      key={pool.id}
                      size="lg"
                      variant={free > 0 ? "solid" : "outline"}
                      disabled={free === 0}
                      className="w-full justify-between"
                      onClick={() => cast(pool.id)}
                    >
                      <span>{pool.name}</span>
                      <span className="text-sm font-normal opacity-80">
                        {free === 0 ? "leer" : `${free} von ${total} frei`}
                      </span>
                    </Button>
                  ))}
                  {poolsAtLevel.length === 0 ? (
                    <p className="text-sm text-mute">
                      Kein Pool bietet Grad {level} an.
                    </p>
                  ) : null}
                </div>

                <button
                  type="button"
                  onClick={() => cast(null)}
                  className="mt-3 w-full py-2 text-sm text-faint underline-offset-4 hover:text-mute hover:underline"
                >
                  Ohne Zauberplatz wirken
                </button>
              </>
            )}
          </div>

          {spell.description ? (
            <details className="mt-5">
              <summary className="cursor-pointer text-sm font-medium text-mute">
                Beschreibung
              </summary>
              <p className="mt-2 text-sm leading-relaxed whitespace-pre-line text-mute">
                {spell.description}
              </p>
            </details>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <div>
      <dt className="label">{label}</dt>
      <dd className="mt-0.5 text-sm">{value}</dd>
    </div>
  );
}

function parseDamage(json: string): Record<number, string> {
  if (!json) return {};
  try {
    const parsed = JSON.parse(json) as Record<string, string>;
    return Object.fromEntries(
      Object.entries(parsed).map(([key, value]) => [Number(key), value]),
    );
  } catch {
    return {};
  }
}
