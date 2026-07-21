"use client";

import { useState } from "react";

import { Button, cx, Panel, Ratio, SectionLabel } from "@/components/ui";
import type { LiveMutation, LiveState } from "@/lib/live-types";
import { useLiveState } from "@/lib/useLiveState";

import { HpBlock } from "./HpBlock";
import { ResourceRow } from "./ResourceRow";
import { SlotRail } from "./SlotRail";

export type ConditionOption = { key: string; name: string; description: string };

export function Dashboard({
  initial,
  conditions,
  classLabels,
}: {
  initial: LiveState;
  conditions: ConditionOption[];
  /** classKey → Anzeigename, für die Hit-Dice-Zeilen. */
  classLabels: Record<string, string>;
}) {
  const { state, send, connected } = useLiveState(initial);

  return (
    <div className="space-y-3">
      <ConcentrationBanner state={state} onClear={() => send({ type: "concentration.clear" })} />

      <HpBlock state={state} send={send} />

      {state.pools.length > 0 ? (
        <Panel>
          <div className="space-y-5">
            {state.pools.map((pool) => (
              <div key={pool.id}>
                <SectionLabel
                  right={
                    <span className="text-[0.6875rem] text-faint">
                      {pool.recovery === "short" ? "kurze Rast" : "lange Rast"}
                    </span>
                  }
                >
                  {pool.name}
                </SectionLabel>
                <div className="space-y-2">
                  {pool.slots.map((slot) => (
                    <SlotRail
                      key={slot.level}
                      level={slot.level}
                      total={slot.total}
                      used={slot.used}
                      tone={pool.recovery === "short" ? "ember" : "patina"}
                      onChange={(used) =>
                        send({ type: "slot.set", poolId: pool.id, level: slot.level, used })
                      }
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Panel>
      ) : null}

      {state.resources.length > 0 ? (
        <Panel>
          <SectionLabel>Ressourcen</SectionLabel>
          <div className="divide-y divide-edge">
            {state.resources.map((resource) => (
              <ResourceRow
                key={resource.id}
                resource={resource}
                onChange={(current) =>
                  send({ type: "resource.set", resourceId: resource.id, current })
                }
              />
            ))}
          </div>
        </Panel>
      ) : null}

      <Panel>
        <SectionLabel>Hit Dice &amp; Inspiration</SectionLabel>
        <div className="divide-y divide-edge">
          {state.hitDice.map((entry) => (
            <HitDiceRow
              key={entry.classId}
              entry={entry}
              label={classLabels[entry.classKey] ?? entry.classKey}
              conModifier={state.conModifier}
              send={send}
            />
          ))}

          <div className="flex items-center gap-3 py-2">
            <p className="flex-1 text-sm font-medium">Inspiration</p>
            <button
              type="button"
              onClick={() => send({ type: "inspiration.set", value: !state.inspiration })}
              aria-pressed={state.inspiration}
              className={cx(
                "socket socket-brass socket-round",
                state.inspiration ? "socket-full" : "socket-spent",
              )}
            />
          </div>
        </div>
      </Panel>

      <Conditions
        state={state}
        options={conditions}
        onToggle={(key, active) => send({ type: "condition.set", key, active })}
      />

      <RestControls
        onShort={() => send({ type: "rest.short" })}
        onLong={() => send({ type: "rest.long" })}
        state={state}
      />

      {!connected ? (
        <p className="pt-2 text-center text-xs text-brass">
          Keine Live-Verbindung — Änderungen werden gespeichert, andere Geräte
          sehen sie aber erst nach dem Neuladen.
        </p>
      ) : null}
    </div>
  );
}

/**
 * Ein Trefferwürfel-Vorrat, mit dem Weg von der kurzen Rast zurück zu HP.
 *
 * Die App würfelt nicht — das war von Anfang an so entschieden, und es ist
 * am Tisch auch die richtige Reihenfolge: erst rollt der echte Würfel über
 * den Tisch, dann trägt man ein, was oben liegt. Der CON-Modifikator kommt
 * automatisch dazu, weil genau der beim Kopfrechnen untergeht.
 */
function HitDiceRow({
  entry,
  label,
  conModifier,
  send,
}: {
  entry: LiveState["hitDice"][number];
  label: string;
  conModifier: number;
  send: (mutation: LiveMutation) => void;
}) {
  const [roll, setRoll] = useState("");
  const [open, setOpen] = useState(false);

  const free = entry.total - entry.used;
  const value = Number(roll);
  const valid = Number.isFinite(value) && value >= 1 && value <= entry.hitDie;
  const healed = valid ? Math.max(0, value + conModifier) : null;

  const commit = () => {
    if (!valid) return;
    send({ type: "hitdice.spend", classId: entry.classId, roll: value });
    setRoll("");
    setOpen(false);
  };

  return (
    <div className="py-2">
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{label}</p>
          <p className="text-xs text-faint">d{entry.hitDie}</p>
        </div>

        <span className="text-sm">
          <Ratio
            current={free}
            total={entry.total}
            className={free > 0 ? "font-semibold" : "text-faint"}
          />
        </span>

        <Button
          size="sm"
          disabled={free <= 0}
          onClick={() => setOpen(!open)}
          aria-expanded={open}
        >
          Ausgeben
        </Button>

        {entry.used > 0 ? (
          <Button
            size="sm"
            variant="ghost"
            className="w-9 px-0"
            onClick={() =>
              send({
                type: "hitdice.set",
                classId: entry.classId,
                used: entry.used - 1,
              })
            }
            aria-label={`Trefferwürfel ${label} zurückgeben`}
          >
            ↩
          </Button>
        ) : null}
      </div>

      {open ? (
        <div className="mt-2 flex items-center gap-2 rounded-md border border-edge bg-ink px-3 py-2">
          <label className="flex items-center gap-2 text-sm text-mute">
            <span className="whitespace-nowrap">d{entry.hitDie} gewürfelt</span>
            <input
              autoFocus
              type="number"
              inputMode="numeric"
              min={1}
              max={entry.hitDie}
              value={roll}
              onChange={(event) => setRoll(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") commit();
                if (event.key === "Escape") setOpen(false);
              }}
              className="min-h-11 w-16 rounded-md border border-edge bg-panel px-2 text-center font-semibold tabular-nums focus:border-patina focus:outline-none"
            />
          </label>

          <span className="min-w-0 flex-1 truncate text-xs text-faint">
            {healed !== null
              ? `${value} ${conModifier < 0 ? "−" : "+"} ${Math.abs(conModifier)} CON = ${healed} HP`
              : `1 bis ${entry.hitDie}`}
          </span>

          <Button size="sm" variant="heal" disabled={!valid} onClick={commit}>
            Heilen
          </Button>
        </div>
      ) : null}
    </div>
  );
}

/**
 * Konzentration ist die Regel, die am häufigsten vergessen wird. Deshalb
 * bekommt sie ein eigenes, auffälliges Band ganz oben — mitsamt der
 * Erinnerung, was bei Schaden zu würfeln ist.
 */
function ConcentrationBanner({
  state,
  onClear,
}: {
  state: LiveState;
  onClear: () => void;
}) {
  if (!state.concentration) return null;

  const { label, castAtLevel } = state.concentration;

  return (
    <div className="flex items-center gap-3 rounded-lg border border-brass/50 bg-brass/10 px-4 py-3">
      <div className="min-w-0 flex-1">
        <p className="label text-brass">Konzentration</p>
        <p className="mt-0.5 truncate text-sm font-semibold">
          {label || "Aktiv"}
          {castAtLevel > 0 ? (
            <span className="font-normal text-mute"> · Grad {castAtLevel}</span>
          ) : null}
        </p>
        <p className="mt-0.5 text-xs text-mute">
          Bei Schaden: CON-Save gegen DC 10 oder halben Schaden — was höher ist.
        </p>
      </div>
      <Button size="sm" onClick={onClear}>
        Beenden
      </Button>
    </div>
  );
}

function Conditions({
  state,
  options,
  onToggle,
}: {
  state: LiveState;
  options: ConditionOption[];
  onToggle: (key: string, active: boolean) => void;
}) {
  const [open, setOpen] = useState<string | null>(null);
  const active = options.filter((c) => state.conditions.includes(c.key));
  const detail = options.find((c) => c.key === open);

  return (
    <Panel>
      <SectionLabel
        right={
          active.length > 0 ? (
            <span className="text-xs text-ember">{active.length} aktiv</span>
          ) : null
        }
      >
        Conditions
      </SectionLabel>

      <div className="flex flex-wrap gap-1.5">
        {options.map((condition) => {
          const isActive = state.conditions.includes(condition.key);
          return (
            <button
              key={condition.key}
              type="button"
              onClick={() => onToggle(condition.key, !isActive)}
              onContextMenu={(event) => {
                event.preventDefault();
                setOpen(open === condition.key ? null : condition.key);
              }}
              aria-pressed={isActive}
              className={cx(
                "min-h-11 rounded-md border px-3 text-sm transition-colors",
                isActive
                  ? "border-ember bg-ember-deep text-ember"
                  : "border-edge bg-panel-2 text-mute hover:border-edge-bright hover:text-fg",
              )}
            >
              {/* Nur der englische Regelbegriff auf dem Chip — die deutsche
                  Entsprechung steht im Regeltext darunter. */}
              {condition.name.split(" — ")[0]}
            </button>
          );
        })}
      </div>

      {active.length > 0 ? (
        <div className="mt-3 space-y-2">
          {active.map((condition) => (
            <details
              key={condition.key}
              className="rounded-md border border-edge bg-ink px-3 py-2"
            >
              <summary className="cursor-pointer text-sm font-medium text-ember">
                {condition.name}
              </summary>
              <p className="mt-2 text-xs leading-relaxed whitespace-pre-line text-mute">
                {condition.description}
              </p>
            </details>
          ))}
        </div>
      ) : null}

      {detail ? (
        <p className="mt-3 text-xs whitespace-pre-line text-mute">
          {detail.description}
        </p>
      ) : null}
    </Panel>
  );
}

/**
 * Rast mit Vorschau. Ein Fehltipper auf "Lange Rast" mitten im Kampf würde
 * den halben Charakterzustand zurücksetzen — deshalb ein Zwischenschritt,
 * der genau auflistet, was gleich passiert.
 */
function RestControls({
  state,
  onShort,
  onLong,
}: {
  state: LiveState;
  onShort: () => void;
  onLong: () => void;
}) {
  const [pending, setPending] = useState<"short" | "long" | null>(null);

  const shortEffects = [
    ...state.pools.filter((p) => p.recovery === "short").map((p) => p.name),
    ...state.resources.filter((r) => r.recovery === "short").map((r) => r.name),
  ];

  const longEffects = [
    "Trefferpunkte",
    "Death Saves",
    "die Hälfte der Hit Dice",
    "Konzentration",
    ...state.pools.map((p) => p.name),
    ...state.resources.map((r) => r.name),
  ];

  if (pending) {
    const effects = pending === "short" ? shortEffects : longEffects;
    return (
      <Panel>
        <p className="text-sm font-semibold">
          {pending === "short" ? "Kurze Rast" : "Lange Rast"}
        </p>
        <p className="mt-1.5 text-sm text-mute">
          {effects.length > 0 ? (
            <>Zurückgesetzt wird: {effects.join(", ")}.</>
          ) : (
            <>Es gibt nichts zurückzusetzen.</>
          )}
        </p>
        {pending === "short" ? (
          <p className="mt-1.5 text-xs text-faint">
            Trefferpunkte bleiben, wo sie sind — die holst du dir über
            Trefferwürfel zurück, so viele du willst.
          </p>
        ) : null}
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Button onClick={() => setPending(null)}>Abbrechen</Button>
          <Button
            variant="solid"
            onClick={() => {
              if (pending === "short") onShort();
              else onLong();
              setPending(null);
            }}
          >
            Rasten
          </Button>
        </div>
      </Panel>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-2 pt-1">
      <Button size="lg" onClick={() => setPending("short")}>
        Kurze Rast
      </Button>
      <Button size="lg" onClick={() => setPending("long")}>
        Lange Rast
      </Button>
    </div>
  );
}
