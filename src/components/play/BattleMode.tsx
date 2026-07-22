"use client";

import Link from "next/link";
import { useState } from "react";

import { CastSheet, type CastableSpell } from "@/components/spells/CastSheet";
import { cx, Panel, SectionLabel } from "@/components/ui";
import { useLive } from "@/lib/live-context";
import {
  isSlotCost,
  parseActionCost,
  type ActionCost,
} from "@/lib/rules/actions";

import { ConcentrationBanner } from "./Dashboard";
import { HpBlock } from "./HpBlock";
import { PoolsPanel, ResourcesPanel } from "./panels";
import { TurnBar } from "./TurnBar";

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
export function BattleMode({ favorites }: { favorites: CastableSpell[] }) {
  const { state, send, connected } = useLive();
  const [casting, setCasting] = useState<CastableSpell | null>(null);

  return (
    <div className="mx-auto max-w-2xl space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl leading-tight font-semibold tracking-tight text-ember">
          Kampf
        </h1>
        <Link
          href={`/c/${state.characterId}`}
          className="text-sm text-faint transition-colors hover:text-patina"
        >
          Kampf beenden
        </Link>
      </div>

      <ConcentrationBanner
        state={state}
        onClear={() => send({ type: "concentration.clear" })}
      />

      <TurnBar state={state} send={send} />

      <FavoriteSpells
        favorites={favorites}
        state={state}
        onPick={setCasting}
      />

      <HpBlock state={state} send={send} />

      <PoolsPanel state={state} send={send} />

      <ResourcesPanel state={state} send={send} />

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
}: {
  favorites: CastableSpell[];
  state: ReturnType<typeof useLive>["state"];
  onPick: (spell: CastableSpell) => void;
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
              <button
                key={spell.id}
                type="button"
                onClick={() => onPick(spell)}
                className={cx(
                  "min-h-14 rounded-md border border-edge bg-panel-2 px-3 py-2 text-left transition-all hover:border-patina",
                  !ready && "opacity-45",
                )}
              >
                <span className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-medium">
                    {spell.name}
                  </span>
                  <CostBadge cost={cost} />
                </span>
                <span className="mt-0.5 block text-xs text-faint">
                  {spell.level === 0 ? "Cantrip" : `Grad ${spell.level}`}
                  {spell.concentration ? " · K" : ""}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </Panel>
  );
}

/**
 * Die Kostenmarke: Kreis = Aktion, Dreieck = Bonusaktion, Raute =
 * Reaktion. Dieselbe Idee wie in Baldur's Gate — was ein Klick kostet,
 * steht als Form direkt am Knopf, ohne dass man liest.
 */
function CostBadge({ cost }: { cost: ActionCost }) {
  if (cost === "action") {
    return (
      <span
        title="Aktion"
        aria-label="kostet eine Aktion"
        className="size-2.5 shrink-0 rounded-full bg-ember"
      />
    );
  }
  if (cost === "bonus") {
    return (
      <span
        title="Bonusaktion"
        aria-label="kostet eine Bonusaktion"
        className="size-0 shrink-0 border-x-[5px] border-b-[9px] border-x-transparent border-b-patina"
      />
    );
  }
  if (cost === "reaction") {
    return (
      <span
        title="Reaktion"
        aria-label="kostet die Reaktion"
        className="size-2.5 shrink-0 rotate-45 bg-brass"
      />
    );
  }
  return (
    <span className="shrink-0 text-[0.625rem] text-faint" title="Dauert länger">
      lang
    </span>
  );
}
