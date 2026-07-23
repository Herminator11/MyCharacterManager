"use client";

import { ActionShape } from "@/components/icons";
import { Panel, SectionLabel, cx } from "@/components/ui";
import type { LiveLogEntry, LiveState } from "@/lib/live-types";

/**
 * Was in diesem Kampf passiert ist — von selbst mitgeschrieben.
 *
 * Niemand führt mitten im Kampf Protokoll. Deshalb tippt man hier auch
 * nichts: jede Änderung, die ohnehin passiert (Schaden eingetragen, Zauber
 * gewirkt, Ressource verbraucht), landet als Zeile im Log. Gelesen wird es
 * hinterher — "wie viel habe ich abbekommen?", "habe ich Hex schon
 * gewirkt?" — und dafür steht der jüngste Eintrag oben.
 *
 * Die Runden sind die Uhr: Zeitstempel würden nur Platz kosten, denn am
 * Tisch zählt die Reihenfolge, nicht die Minute.
 */
export function CombatLog({ state }: { state: LiveState }) {
  const rounds = groupByRound(state.log);

  return (
    <Panel>
      <SectionLabel>Kampflog</SectionLabel>

      {state.log.length === 0 ? (
        <p className="text-sm text-faint">
          Noch nichts passiert. Schaden, Heilung, gewirkte Zauber und
          verbrauchte Ressourcen stehen hier, sobald du sie einträgst.
        </p>
      ) : (
        <div className="space-y-3">
          {rounds.map(([round, entries]) => (
            <div key={round}>
              <p className="label mb-1 text-faint">Runde {round}</p>
              <ul className="space-y-1">
                {entries.map((entry) => (
                  <li key={entry.id} className="flex items-baseline gap-2">
                    <Marker entry={entry} />
                    <span className="min-w-0 flex-1 text-sm">
                      <span className={TEXT[entry.kind]}>{entry.text}</span>
                      {entry.detail ? (
                        <span className="text-xs text-faint">
                          {" · "}
                          {entry.detail}
                        </span>
                      ) : null}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}

/**
 * Zauber tragen dieselbe Form wie im Zugkonto: Kreis für die Aktion,
 * Dreieck für Bonusaktion und Reaktion — die beiden teilen sich am Tisch
 * ohnehin die Frage "geht das noch?" und damit auch das Zeichen. Alles
 * andere bleibt beim schlichten Punkt.
 */
function Marker({ entry }: { entry: LiveLogEntry }) {
  if (entry.kind === "cast" && entry.actionCost && entry.actionCost !== "long") {
    const isAction = entry.actionCost === "action";
    return (
      <span
        aria-hidden
        className={cx(
          "mt-0.5 flex size-3 shrink-0 items-center justify-center",
          isAction ? "text-patina" : "text-ember",
        )}
      >
        <ActionShape kind={isAction ? "action" : "bonus"} className="size-3" />
      </span>
    );
  }

  return (
    <span
      aria-hidden
      className={cx("mt-1.5 size-1.5 shrink-0 rounded-full", DOT[entry.kind])}
    />
  );
}

/** Nur die drei Dinge, die man beim Überfliegen sucht, tragen Farbe. */
const DOT: Record<LiveLogEntry["kind"], string> = {
  damage: "bg-ember",
  heal: "bg-patina",
  cast: "bg-brass",
  resource: "bg-edge-bright",
  condition: "bg-edge-bright",
  rest: "bg-edge-bright",
  state: "bg-edge-bright",
};

const TEXT: Record<LiveLogEntry["kind"], string> = {
  damage: "text-ember",
  heal: "text-patina",
  cast: "font-medium",
  resource: "text-mute",
  condition: "text-mute",
  rest: "text-mute",
  state: "text-mute",
};

/**
 * Nach Runden gruppieren, jüngste zuerst. Der Server liefert schon in
 * dieser Reihenfolge — hier wird nur gebündelt, nicht sortiert.
 */
function groupByRound(log: LiveLogEntry[]): [number, LiveLogEntry[]][] {
  const groups: [number, LiveLogEntry[]][] = [];

  for (const entry of log) {
    const last = groups[groups.length - 1];
    if (last && last[0] === entry.round) last[1].push(entry);
    else groups.push([entry.round, [entry]]);
  }

  return groups;
}
