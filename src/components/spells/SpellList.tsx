"use client";

import { useMemo, useState } from "react";

import { Button, cx, EmptyState, Panel } from "@/components/ui";
import type { LiveState } from "@/lib/live-types";
import {
  ACTION_COSTS,
  ACTION_LABELS,
  parseActionCost,
  type ActionCost,
} from "@/lib/rules/actions";
import { useLiveState } from "@/lib/useLiveState";

import { CastSheet, type CastableSpell } from "./CastSheet";

export type SpellEntry = CastableSpell & {
  prepared: boolean;
  alwaysPrepared: boolean;
  favorite: boolean;
};

type Filter = {
  query: string;
  level: number | "all";
  school: string | "all";
  preparedOnly: boolean;
  cost: ActionCost | "all";
};

export function SpellList({
  initial,
  spells,
  onTogglePrepared,
  onToggleFavorite,
  onRemove,
}: {
  initial: LiveState;
  spells: SpellEntry[];
  onTogglePrepared: (spellId: number, prepared: boolean) => void;
  onToggleFavorite: (spellId: number, favorite: boolean) => void;
  onRemove: (spellId: number) => void;
}) {
  const { state, send } = useLiveState(initial);
  const [casting, setCasting] = useState<SpellEntry | null>(null);
  const [filter, setFilter] = useState<Filter>({
    query: "",
    level: "all",
    school: "all",
    preparedOnly: false,
    cost: "all",
  });

  const schools = useMemo(
    () =>
      Array.from(new Set(spells.map((s) => s.school).filter(Boolean))).sort(),
    [spells],
  );

  const levels = useMemo(
    () => Array.from(new Set(spells.map((s) => s.level))).sort((a, b) => a - b),
    [spells],
  );

  // Nur die Wirkzeiten anbieten, die dieser Charakter überhaupt hat —
  // ein leerer Filter ist schlimmer als kein Filter.
  const costs = useMemo(() => {
    const present = new Set(spells.map((s) => parseActionCost(s.castingTime)));
    return ACTION_COSTS.filter((cost) => present.has(cost));
  }, [spells]);

  const visible = spells.filter((spell) => {
    if (
      filter.cost !== "all" &&
      parseActionCost(spell.castingTime) !== filter.cost
    ) {
      return false;
    }
    if (filter.level !== "all" && spell.level !== filter.level) return false;
    if (filter.school !== "all" && spell.school !== filter.school) return false;
    if (filter.preparedOnly && !(spell.prepared || spell.alwaysPrepared)) {
      // Cantrips sind immer verfügbar und gehören nie ausgeblendet.
      if (spell.level !== 0) return false;
    }
    if (
      filter.query &&
      !spell.name.toLowerCase().includes(filter.query.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  const grouped = useMemo(() => {
    const map = new Map<number, SpellEntry[]>();
    for (const spell of visible) {
      const list = map.get(spell.level) ?? [];
      list.push(spell);
      map.set(spell.level, list);
    }
    return [...map.entries()].sort((a, b) => a[0] - b[0]);
  }, [visible]);

  return (
    <div className="space-y-3">
      {/* Verfügbare Slots bleiben beim Blättern durch die Liste sichtbar —
          sonst müsste man für jede Entscheidung zurück aufs Dashboard. */}
      {state.pools.length > 0 ? (
        <div className="sticky top-[3.75rem] z-10 space-y-2 rounded-lg border border-edge bg-panel px-3 py-2.5">
          {state.pools.map((pool) => (
            <div key={pool.id} className="text-xs">
              <p className="label mb-1.5 truncate">{pool.name}</p>
              {/* Ausgeschrieben statt "1: 4": die nackte Zahl vor dem
                  Doppelpunkt las sich nicht als Grad, und ohne Gesamtzahl
                  sah man nicht, ob 2 viel oder wenig ist. */}
              <div className="flex flex-wrap gap-1">
                {pool.slots.map((slot) => {
                  const free = slot.total - slot.used;
                  return (
                    <span
                      key={slot.level}
                      className={cx(
                        "rounded px-1.5 py-0.5 whitespace-nowrap tabular-nums",
                        free > 0
                          ? "bg-patina-deep text-patina"
                          : "bg-ink text-faint",
                      )}
                    >
                      Grad {slot.level} · {free}/{slot.total}
                    </span>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      ) : null}

      <Panel className="space-y-3">
        <input
          value={filter.query}
          onChange={(event) =>
            setFilter((f) => ({ ...f, query: event.target.value }))
          }
          placeholder="Zauber suchen…"
          className="w-full min-h-11 rounded-md border border-edge bg-ink px-3 text-fg placeholder:text-faint focus:border-patina focus:outline-none"
        />

        {/* Jede Filtergruppe eine eigene, waagrecht wischbare Reihe: beim
            Umbrechen stand "Reaktion" allein in einer Zeile und die Grenze
            zwischen Grad, Wirkzeit und dem Rest war nicht mehr zu sehen.
            -mx-4/px-4 lässt die Reihe bis an den Panelrand laufen, damit
            man sieht, dass sie weitergeht. */}
        <div role="group" aria-label="Grad" className={FILTER_ROW}>
          <FilterChip
            active={filter.level === "all"}
            onClick={() => setFilter((f) => ({ ...f, level: "all" }))}
          >
            Alle Grade
          </FilterChip>
          {levels.map((level) => (
            <FilterChip
              key={level}
              active={filter.level === level}
              onClick={() => setFilter((f) => ({ ...f, level }))}
            >
              {level === 0 ? "Zaubertricks" : `Grad ${level}`}
            </FilterChip>
          ))}
        </div>

        {/* Die Frage mitten im Kampf lautet nicht "welchen Grad?", sondern
            "was geht als Bonusaktion noch?". Die Wirkzeit steht in jedem
            SRD-Eintrag — der Filter fällt daraus ab. */}
        <div role="group" aria-label="Wirkzeit" className={FILTER_ROW}>
          <FilterChip
            active={filter.cost === "all"}
            onClick={() => setFilter((f) => ({ ...f, cost: "all" }))}
          >
            Jede Wirkzeit
          </FilterChip>
          {costs.map((cost) => (
            <FilterChip
              key={cost}
              active={filter.cost === cost}
              onClick={() => setFilter((f) => ({ ...f, cost }))}
            >
              {ACTION_LABELS[cost]}
            </FilterChip>
          ))}
        </div>

        <div role="group" aria-label="Sonstiges" className={FILTER_ROW}>
          <FilterChip
            active={filter.preparedOnly}
            onClick={() =>
              setFilter((f) => ({ ...f, preparedOnly: !f.preparedOnly }))
            }
          >
            Nur vorbereitete
          </FilterChip>
          {schools.length > 1 ? (
            <select
              value={filter.school}
              onChange={(event) =>
                setFilter((f) => ({ ...f, school: event.target.value }))
              }
              aria-label="Schule"
              className="min-h-11 shrink-0 rounded-md border border-edge-bright bg-panel-2 px-2.5 text-sm text-fg focus:border-patina focus:outline-none"
            >
              <option value="all">Alle Schulen</option>
              {schools.map((school) => (
                <option key={school} value={school}>
                  {school}
                </option>
              ))}
            </select>
          ) : null}
        </div>
      </Panel>

      {grouped.length === 0 ? (
        <EmptyState
          title={
            spells.length === 0
              ? "Noch keine Zauber in deiner Liste."
              : "Kein Zauber passt zu diesen Filtern."
          }
        >
          {spells.length === 0
            ? "Such unten im Katalog nach einem Zauber und füg ihn hinzu."
            : null}
        </EmptyState>
      ) : (
        grouped.map(([level, entries]) => (
          <Panel key={level}>
            <h2 className="label mb-2">
              {level === 0 ? "Zaubertricks" : `Grad ${level}`}
            </h2>
            <ul className="divide-y divide-edge">
              {entries.map((spell) => (
                <li key={spell.id} className="flex items-center gap-2 py-1.5">
                  {/* Der Stern kürt die Handvoll Zauber, die im Kampfmodus
                      als eigene Knöpfe bereitliegen. */}
                  <button
                    type="button"
                    onClick={() => onToggleFavorite(spell.id, !spell.favorite)}
                    aria-pressed={spell.favorite}
                    aria-label={
                      spell.favorite
                        ? `${spell.name} aus den Favoriten nehmen`
                        : `${spell.name} favorisieren`
                    }
                    className="flex min-h-11 w-11 shrink-0 items-center justify-center text-faint transition-colors hover:text-brass"
                  >
                    <svg viewBox="0 0 24 24" aria-hidden className="size-4">
                      <path
                        d="M12 3.5 14.6 9l6 .8-4.4 4.2 1.1 6-5.3-2.9L6.7 20l1.1-6L3.4 9.8 9.4 9z"
                        fill={spell.favorite ? "var(--color-brass)" : "none"}
                        stroke={
                          spell.favorite ? "var(--color-brass)" : "currentColor"
                        }
                        strokeWidth="1.6"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCasting(spell)}
                    // min-w-0: sonst schrumpft der Knopf nicht unter Name
                    // plus K/R-Marken, und die Zeile ragte bei 360 px über
                    // den Panelrand statt den Namen abzuschneiden.
                    className="min-h-11 min-w-0 flex-1 rounded-md px-1 text-left transition-colors hover:bg-panel-2"
                  >
                    <span className="flex items-center gap-1.5">
                      <span className="truncate font-medium">{spell.name}</span>
                      {spell.concentration ? (
                        <span
                          title="Konzentration"
                          className="shrink-0 rounded bg-brass/15 px-1 text-[0.625rem] font-semibold text-brass"
                        >
                          K
                        </span>
                      ) : null}
                      {spell.ritual ? (
                        <span
                          title="Ritual"
                          className="shrink-0 rounded bg-panel-2 px-1 text-[0.625rem] font-semibold text-mute"
                        >
                          R
                        </span>
                      ) : null}
                    </span>
                    <span className="block truncate text-xs text-faint">
                      {[spell.castingTime, spell.range]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  </button>

                  {level > 0 ? (
                    <button
                      type="button"
                      onClick={() =>
                        onTogglePrepared(spell.id, !spell.prepared)
                      }
                      aria-pressed={spell.prepared}
                      aria-label={`${spell.name} vorbereiten`}
                      className={cx(
                        "min-h-11 shrink-0 rounded-md border px-2.5 text-xs font-semibold transition-colors",
                        spell.prepared
                          ? "border-patina bg-patina-deep text-patina"
                          : "border-edge text-faint hover:text-mute",
                      )}
                    >
                      {spell.prepared ? "Bereit" : "—"}
                    </button>
                  ) : null}

                  <button
                    type="button"
                    onClick={() => onRemove(spell.id)}
                    aria-label={`${spell.name} entfernen`}
                    className="min-h-11 min-w-11 shrink-0 text-faint transition-colors hover:text-ember"
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          </Panel>
        ))
      )}

      {casting ? (
        <CastSheet
          spell={casting}
          state={state}
          onCast={send}
          onClose={() => setCasting(null)}
        />
      ) : null}
    </div>
  );
}

// py-1/-my-1: overflow-x schneidet sonst den Fokusrahmen oben und unten ab.
const FILTER_ROW =
  "scrollbar-none -mx-4 -my-1 flex gap-1.5 overflow-x-auto px-4 py-1";

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Button
      size="sm"
      onClick={onClick}
      aria-pressed={active}
      className={cx(
        "shrink-0",
        active && "border-patina bg-patina-deep text-patina",
      )}
    >
      {children}
    </Button>
  );
}
