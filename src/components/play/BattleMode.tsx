"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { CastSheet, type CastableSpell } from "@/components/spells/CastSheet";
import { ACTION_TONE, ActionShape, CrossedSwordsIcon, PlayIcon } from "@/components/icons";
import { cx, Panel, SectionLabel } from "@/components/ui";
import { characterPath } from "@/lib/characterUrl";
import { useLive } from "@/lib/live-context";
import type { LiveMutation } from "@/lib/live-types";
import {
  parseActionCost,
  type ActionCost,
  type ActionSlot,
} from "@/lib/rules/actions";
import { formatModifier } from "@/lib/rules/derive";

import { CombatLog } from "./CombatLog";
import { ConcentrationBanner, Conditions, type ConditionOption } from "./Dashboard";
import { HpBlock } from "./HpBlock";
import { PoolsPanel, ResourcesPanel } from "./panels";
import { TurnBar } from "./TurnBar";

export type BattleAttack = {
  id: number;
  name: string;
  cost: ActionSlot;
  bonus: number;
  damageLine: string;
};

/**
 * Der Kampfmodus — die Seite, die während einer Begegnung offen bleibt.
 *
 * Angelehnt an die Aktionsleiste aus Baldur's Gate, auf das reduziert, was
 * ohne Engine trägt: oben der Zug, darunter die favorisierten Zauber als
 * Knöpfe mit Kostenmarke. Ist das passende Konto verbraucht oder kein
 * Zauberplatz mehr frei, wird der Knopf blass — aber nicht gesperrt. Die
 * App weiß nicht, ob Action Surge im Spiel ist oder der DM eine Ausnahme
 * erlaubt; sie zeigt an, sie verbietet nicht.
 */
export function BattleMode({
  favorites,
  attacks,
  conditions,
  characterName,
}: {
  favorites: CastableSpell[];
  attacks: BattleAttack[];
  conditions: ConditionOption[];
  characterName: string;
}) {
  const { state, send, connected } = useLive();
  const [casting, setCasting] = useState<CastableSpell | null>(null);
  const [expandedSlot, setExpandedSlot] = useState<ActionSlot | null>(null);
  const router = useRouter();
  const overviewHref = characterPath(state.characterId, characterName);

  // Erst das Kampfende buchen, dann wechseln: die Übersicht wird auf dem
  // Server gerendert und zeigte sonst noch den laufenden Kampf.
  const finish = async () => {
    await send({ type: "battle.end" });
    router.push(overviewHref);
  };

  return (
    <div className="mx-auto max-w-2xl space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl leading-tight font-semibold tracking-tight text-ember">
          Kampf
          {state.round > 0 ? (
            <span className="ml-2 text-base font-normal text-mute">
              Runde {state.round}
            </span>
          ) : null}
        </h1>
        {state.round > 0 ? (
          <button
            type="button"
            onClick={finish}
            className="-my-3 inline-flex min-h-11 items-center text-sm text-mute transition-colors hover:text-patina"
          >
            Kampf beenden
          </button>
        ) : (
          <Link
            href={overviewHref}
            className="-my-3 inline-flex min-h-11 items-center text-sm text-mute transition-colors hover:text-patina"
          >
            Zur Übersicht
          </Link>
        )}
      </div>

      {/* Diese Seite bleibt auch nach dem Kampf begehbar — man sieht das
          Log noch einmal durch. Ein neuer Kampf beginnt deshalb nur auf
          ausdrückliches Tippen; sonst löschte jeder Blick zurück genau
          das, wofür man gekommen ist. */}
      {state.round === 0 ? (
        <button
          type="button"
          onClick={() => send({ type: "battle.start" })}
          className="flex min-h-14 w-full items-center justify-between gap-4 rounded-lg border border-ember-dim bg-ember-deep/40 px-4 text-ember transition-colors hover:border-ember"
        >
          <span className="flex items-center gap-2.5 font-semibold tracking-tight">
            <CrossedSwordsIcon className="size-5" />
            Neuen Kampf beginnen
          </span>
          {/* Früher "Log auf null" — gemeint ist, dass der neue Kampf das
              Kampflog des letzten leert. Das soll man vor dem Tippen
              verstehen, nicht danach. */}
          <span className="text-right text-xs font-normal text-mute">
            leert das Kampflog
          </span>
        </button>
      ) : null}

      <ConcentrationBanner
        state={state}
        onClear={() => send({ type: "concentration.clear" })}
      />

      <TurnBar
        state={state}
        send={send}
        expanded={expandedSlot}
        onToggle={setExpandedSlot}
      />

      {/* Was zum aufgeklappten Konto passt — Zauber und Waffen, die genau
          das kosten, und nur die, die gerade auch wirklich frei sind. Ein
          Tipp auf "Aktion" beantwortet direkt "was kann ich noch", statt
          erst auf einen anderen Reiter zu schicken. */}
      <TurnOptions
        slot={expandedSlot}
        favorites={favorites}
        attacks={attacks}
        state={state}
        onPickSpell={(spell) => {
          setCasting(spell);
          setExpandedSlot(null);
        }}
        onQuickCast={(spell) => {
          send(quickCastMutation(spell, state));
          setExpandedSlot(null);
        }}
        onAttack={() => {
          if (!expandedSlot) return;
          send({ type: "turn.set", slot: expandedSlot, used: true });
          setExpandedSlot(null);
        }}
        onMarkUsed={() => {
          if (!expandedSlot) return;
          send({ type: "turn.set", slot: expandedSlot, used: true });
          setExpandedSlot(null);
        }}
      />

      {/* Was gerade gilt, gehört hierher, nicht nur auf die Übersicht —
          Frightened oder Poisoned ändert sich am häufigsten mitten im
          Kampf, nicht dazwischen. */}
      <Conditions
        state={state}
        options={conditions}
        onToggle={(key, active) => send({ type: "condition.set", key, active })}
      />

      <HpBlock state={state} send={send} />

      <PoolsPanel state={state} send={send} />

      <ResourcesPanel state={state} send={send} />

      <CombatLog state={state} />

      {!connected ? (
        <p className="pt-2 text-center text-xs text-brass">
          Keine Live-Verbindung — Änderungen werden gespeichert, andere Geräte
          sehen sie aber erst nach dem Neuladen.
        </p>
      ) : null}

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

/**
 * Was zum aufgeklappten Konto der Zugleiste gehört: Zauber mit genau
 * dieser Wirkzeit (und noch einem freien Slot), dazu — nur bei Aktion —
 * die Waffen, weil ein Angriff in 5e die Aktion selbst ist. Vorher
 * standen Zauber immer sichtbar in einem eigenen Block und Waffen nur
 * auf dem Angriffe-Tab; beides zeigte alles auf einmal, statt zu
 * beantworten, was gerade zum offenen Konto passt.
 */
function TurnOptions({
  slot,
  favorites,
  attacks,
  state,
  onPickSpell,
  onQuickCast,
  onAttack,
  onMarkUsed,
}: {
  slot: ActionSlot | null;
  favorites: CastableSpell[];
  attacks: BattleAttack[];
  state: ReturnType<typeof useLive>["state"];
  onPickSpell: (spell: CastableSpell) => void;
  onQuickCast: (spell: CastableSpell) => void;
  onAttack: () => void;
  onMarkUsed: () => void;
}) {
  if (!slot) return null;

  const readySpells = favorites.filter((spell) => {
    if (parseActionCost(spell.castingTime) !== slot) return false;
    return (
      spell.level === 0 ||
      state.pools.some((pool) =>
        pool.slots.some((s) => s.level >= spell.level && s.used < s.total),
      )
    );
  });

  // Normalerweise die Aktion selbst — Nebenhand-Angriffe & Co. tragen ihre
  // Kosten aber jetzt selbst (im Angriffe-Tab gesetzt, "Kosten"-Feld).
  const readyAttacks = attacks.filter((attack) => attack.cost === slot);

  const empty = readySpells.length === 0 && readyAttacks.length === 0;

  return (
    <div className="-mt-1 space-y-2 rounded-lg border border-edge bg-ink px-3.5 py-3">
      {empty ? (
        <p className="text-sm text-faint">
          Nichts hinterlegt, das {COST_LABEL[slot]} kostet.
        </p>
      ) : (
        <div className="space-y-1.5">
          {readySpells.map((spell) => (
            <div
              key={spell.id}
              className="flex items-center justify-between gap-2 rounded-md border border-edge bg-panel-2 py-1 pr-1.5 pl-3"
            >
              <button
                type="button"
                onClick={() => onPickSpell(spell)}
                className="min-w-0 flex-1 text-left"
              >
                <span className="truncate block text-sm font-medium">
                  {spell.name}
                </span>
                <span className="text-xs text-faint">
                  {spell.level === 0 ? "Zaubertrick" : `Grad ${spell.level}`}
                  {spell.concentration ? " · K" : ""}
                </span>
              </button>
              <button
                type="button"
                onClick={() => onQuickCast(spell)}
                aria-label={`${spell.name} direkt wirken`}
                title="Direkt wirken"
                className="flex size-7 shrink-0 items-center justify-center rounded text-patina transition-colors hover:bg-patina-deep"
              >
                <PlayIcon className="size-3.5" />
              </button>
            </div>
          ))}

          {readyAttacks.map((attack) => (
            <button
              key={attack.id}
              type="button"
              onClick={onAttack}
              className="flex w-full items-center justify-between gap-3 rounded-md border border-edge bg-panel-2 px-3 py-2 text-left transition-colors hover:border-patina"
            >
              <span className="truncate text-sm font-medium">{attack.name}</span>
              <span className="shrink-0 text-right">
                <span className="font-numeral text-sm font-semibold text-patina">
                  {formatModifier(attack.bonus)}
                </span>
                <span className="ml-2 text-xs text-mute">{attack.damageLine}</span>
              </span>
            </button>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={onMarkUsed}
        className="text-xs text-faint transition-colors hover:text-patina"
      >
        Ohne Auswahl als verbraucht markieren
      </button>
    </div>
  );
}

/**
 * Was der Play-Knopf tatsächlich wirkt: kein Hochwirken, kein
 * Pool-Auswahldialog — der erste Pool mit freiem Slot am Mindestgrad.
 * Genau der Pfad, den das Cast-Sheet auch vorschlägt, nur ohne den
 * Zwischenschritt. Ohne freien Slot wirkt es wie "Ohne Zauberplatz
 * wirken" im Sheet: nicht gesperrt, nur ohne Slot verbucht.
 */
function quickCastMutation(
  spell: CastableSpell,
  state: ReturnType<typeof useLive>["state"],
): LiveMutation {
  const level = Math.max(spell.level, 1);
  const pool = state.pools.find((p) =>
    p.slots.some((s) => s.level === level && s.used < s.total),
  );
  const poolId = spell.level === 0 ? null : (pool?.id ?? null);

  return {
    type: "cast",
    poolId,
    level: poolId === null ? 0 : level,
    spellId: spell.id,
    spellName: spell.name,
    concentration: spell.concentration,
    cost: parseActionCost(spell.castingTime),
  };
}

/**
 * Die Kostenmarke am Zauberknopf — dieselben drei Formen wie in der
 * Zugleiste darüber, in denselben Farben. Was ein Tipp kostet, steht als
 * Form am Knopf, und man findet es eine Handbreit weiter oben wieder.
 */
function CostBadge({ cost }: { cost: ActionCost }) {
  if (cost === "long") {
    return (
      <span className="shrink-0 text-[0.625rem] text-faint" title="Dauert länger">
        lang
      </span>
    );
  }

  const tone = ACTION_TONE[cost];

  // Die Form selbst ist `aria-hidden`; der Name gehört an die Hülle,
  // sonst liest ein Screenreader an dieser Stelle gar nichts vor.
  return (
    <span
      title={COST_LABEL[cost]}
      aria-label={`kostet ${COST_LABEL[cost]}`}
      className={cx("shrink-0", tone)}
    >
      <ActionShape kind={cost} className="size-3" />
    </span>
  );
}

const COST_LABEL = {
  action: "Aktion",
  bonus: "Bonusaktion",
  reaction: "Reaktion",
} as const;
