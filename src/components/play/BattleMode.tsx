"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { CastSheet, type CastableSpell } from "@/components/spells/CastSheet";
import { ActionShape, CrossedSwordsIcon, PlayIcon } from "@/components/icons";
import { cx, Panel, SectionLabel } from "@/components/ui";
import { characterPath } from "@/lib/characterUrl";
import { useLive } from "@/lib/live-context";
import type { LiveMutation } from "@/lib/live-types";
import {
  isSlotCost,
  parseActionCost,
  type ActionCost,
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
            className="text-sm text-faint transition-colors hover:text-patina"
          >
            Kampf beenden
          </button>
        ) : (
          <Link
            href={overviewHref}
            className="text-sm text-faint transition-colors hover:text-patina"
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
            Combat Mode
          </span>
          <span className="text-sm font-normal text-mute">Log auf null</span>
        </button>
      ) : null}

      <ConcentrationBanner
        state={state}
        onClear={() => send({ type: "concentration.clear" })}
      />

      <TurnBar state={state} send={send} />

      {/* Was gerade gilt, gehört hierher, nicht nur auf die Übersicht —
          Frightened oder Poisoned ändert sich am häufigsten mitten im
          Kampf, nicht dazwischen. */}
      <Conditions
        state={state}
        options={conditions}
        onToggle={(key, active) => send({ type: "condition.set", key, active })}
      />

      <FavoriteSpells
        favorites={favorites}
        state={state}
        onPick={setCasting}
        onQuickCast={(spell) => send(quickCastMutation(spell, state))}
      />

      <Attacks attacks={attacks} />

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

function FavoriteSpells({
  favorites,
  state,
  onPick,
  onQuickCast,
}: {
  favorites: CastableSpell[];
  state: ReturnType<typeof useLive>["state"];
  onPick: (spell: CastableSpell) => void;
  onQuickCast: (spell: CastableSpell) => void;
}) {
  return (
    <Panel>
      <SectionLabel
        right={
          <span className="text-[0.6875rem] text-faint">
            Stern auf der Zauberseite
          </span>
        }
      >
        Deine Zauber
      </SectionLabel>

      {favorites.length === 0 ? (
        <p className="text-sm text-faint">
          Noch keine Favoriten. Markiere unter Zauber die Handvoll, die du
          wirklich wirfst — sie liegen dann hier bereit.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {favorites.map((spell) => {
            const cost = parseActionCost(spell.castingTime);
            // Blass, wenn das Konto weg ist oder kein Slot mehr passt —
            // dieselbe Sprache wie in Baldur's Gate, nur ohne Sperre.
            const slotFree =
              spell.level === 0 ||
              state.pools.some((pool) =>
                pool.slots.some(
                  (s) => s.level >= spell.level && s.used < s.total,
                ),
              );
            const turnFree = !isSlotCost(cost) || !state.turn[cost];
            const ready = slotFree && turnFree;

            return (
              <div
                key={spell.id}
                className={cx(
                  "min-h-14 rounded-md border border-edge bg-panel-2 transition-all hover:border-patina",
                  !ready && "opacity-45",
                )}
              >
                {/* Der Play-Knopf wirkt sofort (Mindestgrad, erster freier
                    Pool) — für alles andere (Hochwirken, Pool wählen,
                    Beschreibung) bleibt der Rest der Kachel der Weg zum
                    Cast-Sheet. Zwei Knöpfe statt einem verschachtelten. */}
                <button
                  type="button"
                  onClick={() => onPick(spell)}
                  className="block w-full px-3 pt-2 text-left"
                >
                  <span className="truncate block text-sm font-medium">
                    {spell.name}
                  </span>
                </button>
                <div className="flex items-center justify-between gap-2 py-1 pr-1.5 pl-3">
                  <button
                    type="button"
                    onClick={() => onPick(spell)}
                    className="min-w-0 flex-1 text-left text-xs text-faint"
                  >
                    {spell.level === 0 ? "Cantrip" : `Grad ${spell.level}`}
                    {spell.concentration ? " · K" : ""}
                  </button>
                  <span className="flex shrink-0 items-center gap-1">
                    <CostBadge cost={cost} />
                    <button
                      type="button"
                      onClick={() => onQuickCast(spell)}
                      aria-label={`${spell.name} direkt wirken`}
                      title="Direkt wirken"
                      className="flex size-6 items-center justify-center rounded text-patina transition-colors hover:bg-patina-deep"
                    >
                      <PlayIcon className="size-3.5" />
                    </button>
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Panel>
  );
}

/**
 * Waffen — reine Anzeige, keine Mutation. Vorher stand Treffer-/
 * Schadensbonus nur auf dem Angriffe-Tab: für die Zahl mitten im Kampf
 * musste man den Kampfmodus verlassen und danach den Schaden von dort
 * aus separat in den HP-Block eintippen. Geändert wird die Waffe weiter
 * im Angriffe-Tab — hier reicht die Zahl, die man gleich braucht.
 */
function Attacks({ attacks }: { attacks: BattleAttack[] }) {
  if (attacks.length === 0) return null;

  return (
    <Panel>
      <SectionLabel>Angriffe</SectionLabel>
      <ul className="divide-y divide-edge">
        {attacks.map((attack) => (
          <li key={attack.id} className="flex items-center justify-between gap-3 py-2">
            <span className="truncate text-sm font-medium">{attack.name}</span>
            <span className="shrink-0 text-right">
              <span className="font-numeral text-base font-semibold text-patina">
                {formatModifier(attack.bonus)}
              </span>
              <span className="ml-2 text-xs text-mute">{attack.damageLine}</span>
            </span>
          </li>
        ))}
      </ul>
    </Panel>
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

  const tone =
    cost === "action"
      ? "text-patina"
      : cost === "bonus"
        ? "text-ember"
        : "text-brass";

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
