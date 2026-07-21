"use client";

import { useMemo, useState } from "react";

import { Button, cx, EmptyState, Panel } from "@/components/ui";
import type { LiveState } from "@/lib/live-types";
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
};

export function SpellList({
  initial,
  spells,
  onTogglePrepared,
  onRemove,
}: {
  initial: LiveState;
  spells: SpellEntry[];
  onTogglePrepared: (spellId: number, prepared: boolean) => void;
  onRemove: (spellId: number) => void;
}) {
  const { state, send } = useLiveState(initial);
  const [casting, setCasting] = useState<SpellEntry | null>(null);
  const [filter, setFilter] = useState<Filter>({
    query: "",
    level: "all",
    school: "all",
    preparedOnly: false,
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

  const visible = spells.filter((spell) => {
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
        <div className="sticky top-[3.75rem] z-10 space-y-1.5 rounded-lg border border-edge bg-panel/95 px-3 py-2.5 backdrop-blur">
          {state.pools.map((pool) => (
            <div key={pool.id} className="flex items-center gap-2 text-xs">
              <span className="w-24 shrink-0 truncate text-faint">
                {pool.name}
              </span>
              <div className="flex flex-wrap gap-1">
                {pool.slots.map((slot) => {
                  const free = slot.total - slot.used;
                  return (
                    <span
                      key={slot.level}
                      className={cx(
                        "rounded px-1.5 py-0.5 tabular-nums",
                        free > 0
                          ? "bg-patina-deep text-patina"
                          : "bg-ink text-faint",
                      )}
                    >
                      {slot.level}: {free}
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

        <div className="flex flex-wrap gap-1.5">
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
              {level === 0 ? "Cantrips" : level}
            </FilterChip>
          ))}
        </div>

        <div className="flex flex-wrap gap-1.5">
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
              className="min-h-11 rounded-md border border-edge bg-panel-2 px-2.5 text-sm text-mute focus:border-patina focus:outline-none"
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
              {level === 0 ? "Cantrips" : `Grad ${level}`}
            </h2>
            <ul className="divide-y divide-edge">
              {entries.map((spell) => (
                <li key={spell.id} className="flex items-center gap-2 py-1.5">
                  <button
                    type="button"
                    onClick={() => setCasting(spell)}
                    className="min-h-11 flex-1 rounded-md px-1 text-left transition-colors hover:bg-panel-2"
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
                    className="min-h-11 shrink-0 px-2 text-faint transition-colors hover:text-ember"
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
        active && "border-patina bg-patina-deep text-patina",
      )}
    >
      {children}
    </Button>
  );
}
