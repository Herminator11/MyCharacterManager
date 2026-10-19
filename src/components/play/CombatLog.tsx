"use client";

import { ACTION_TONE, ActionShape } from "@/components/icons";
import { Panel, SectionLabel, cx } from "@/components/ui";
import type { LiveLogEntry, LiveState } from "@/lib/live-types";
import { useT } from "@/lib/i18n/client";
import { renderLogLine } from "@/lib/i18n/log";
import { groupByRound } from "@/lib/rules/combatLog";

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
  const t = useT();
  const rounds = groupByRound(state.log);

  return (
    <Panel>
      <SectionLabel>{t.battle.log}</SectionLabel>

      {state.log.length === 0 ? (
        <p className="text-sm text-faint">
          {t.battle.logEmpty}
        </p>
      ) : (
        <div className="space-y-3">
          {rounds.map(([round, entries]) => (
            <div key={round}>
              <p className="label mb-1 text-faint">{t.play.round(round)}</p>
              <ul className="space-y-1">
                {entries.map((entry) => (
                  <CombatLogRow key={entry.id} entry={entry} />
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
 * Eine Zeile für sich — wiederverwendet, wo Kampflog-Einträge auch
 * außerhalb des laufenden Kampfs auftauchen, etwa im Kampagnen-Log.
 */
export function CombatLogRow({ entry }: { entry: LiveLogEntry }) {
  const t = useT();
  const { text, detail } = renderLogLine(t, entry);
  return (
    <li className="flex items-baseline gap-2">
      <Marker entry={entry} />
      <span className="min-w-0 flex-1 text-sm">
        <span className={TEXT[entry.kind]}>{text}</span>
        {detail ? (
          <span className="text-xs text-faint">
            {" · "}
            {detail}
          </span>
        ) : null}
      </span>
    </li>
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
    const cost = entry.actionCost;
    return (
      <span
        aria-hidden
        className={cx(
          "mt-0.5 flex size-3 shrink-0 items-center justify-center",
          ACTION_TONE[cost],
        )}
      >
        <ActionShape kind={cost} className="size-3" />
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
