import "server-only";

import { and, eq, inArray } from "drizzle-orm";

import { db, sqlite } from "@/db";
import {
  activeConditions,
  characterClasses,
  characters,
  combatLog,
  concentration,
  notes,
  resources,
  spellPools,
  spellPoolSlots,
  type Recovery,
} from "@/db/schema";
import type { LiveMutation, LiveState } from "@/lib/live-types";
import { isSlotCost, type ActionSlot } from "@/lib/rules/actions";
import { describeMutation, summarize } from "@/lib/rules/combatLog";
import {
  applyHpDelta,
  setHp,
  type HpChange,
  type HpState,
} from "@/lib/rules/hp";

import { getLiveState, touch } from "./characters";

/**
 * Wendet eine Live-Aktion an und gibt den frischen Gesamtzustand zurück.
 *
 * Läuft komplett in einer Transaktion: entweder die Aktion greift ganz oder
 * gar nicht. Das ist kein Luxus — beim Wirken eines Zaubers werden Slot,
 * Konzentration und Zeitstempel zusammen geschrieben, und ein halb
 * ausgeführter Cast wäre mitten im Kampf schwer zu bemerken.
 */
export function applyMutation(
  characterId: number,
  mutation: LiveMutation,
): LiveState | null {
  const run = sqlite.transaction(() => {
    // Der Zustand davor ist die halbe Miete für das Kampflog: erst der
    // Vergleich mit dem Zustand danach sagt, was wirklich passiert ist.
    const before = getLiveState(characterId);
    apply(characterId, mutation);
    if (before) record(characterId, mutation, before);
    touch(characterId);
  });

  run();
  return getLiveState(characterId);
}

function apply(characterId: number, mutation: LiveMutation) {
  switch (mutation.type) {
    case "hp.delta":
      changeHp(
        characterId,
        (state, hpMax) => applyHpDelta(state, hpMax, mutation.amount),
        // Ausdrücklich mitgegeben, weil man es dem Ergebnis nicht ansieht:
        // Schaden auf jemanden, der schon bei 0 liegt, ändert keine Zahl —
        // hebt aber die Stabilisierung auf.
        mutation.amount < 0,
      );
      return;

    case "hp.set":
      changeHp(characterId, (state, hpMax) =>
        setHp(state, hpMax, mutation.value),
      );
      return;

    case "hp.temp":
      db.update(characters)
        .set({ hpTemp: Math.max(0, Math.round(mutation.value)) })
        .where(eq(characters.id, characterId))
        .run();
      return;

    case "death.set": {
      const successes = clamp(mutation.successes, 0, 3);
      const failures = clamp(mutation.failures, 0, 3);

      // Drei Erfolge stabilisieren: die Häkchen werden gelöscht, weil beim
      // nächsten Absinken auf 0 wieder bei null angefangen wird. Nur der
      // Zustand bleibt — ohne ihn wäre "stabil" hinterher nicht mehr von
      // "sterbend" zu unterscheiden.
      const stable = successes >= 3;

      db.update(characters)
        .set({
          deathSaveSuccesses: stable ? 0 : successes,
          deathSaveFailures: stable ? 0 : failures,
          stabilized: stable,
        })
        .where(eq(characters.id, characterId))
        .run();
      return;
    }

    case "inspiration.set":
      db.update(characters)
        .set({ inspiration: mutation.value })
        .where(eq(characters.id, characterId))
        .run();
      return;

    case "hitdice.set": {
      const row = db
        .select()
        .from(characterClasses)
        .where(
          and(
            eq(characterClasses.id, mutation.classId),
            eq(characterClasses.characterId, characterId),
          ),
        )
        .get();
      if (!row) return;
      db.update(characterClasses)
        .set({ hitDiceUsed: clamp(mutation.used, 0, row.level) })
        .where(eq(characterClasses.id, row.id))
        .run();
      return;
    }

    case "hitdice.spend": {
      const live = getLiveState(characterId);
      const entry = live?.hitDice.find((h) => h.classId === mutation.classId);
      if (!live || !entry || entry.used >= entry.total) return;

      db.update(characterClasses)
        .set({ hitDiceUsed: entry.used + 1 })
        .where(eq(characterClasses.id, entry.classId))
        .run();

      // Ein schlechter Wurf bei negativem CON heilt null, nie negativ —
      // der Würfel ist dann trotzdem weg. So steht es in den Regeln.
      const healed = Math.max(0, Math.round(mutation.roll) + live.conModifier);
      changeHp(characterId, (state, hpMax) =>
        applyHpDelta(state, hpMax, healed),
      );
      return;
    }

    case "turn.set":
      spendSlot(characterId, mutation.slot, mutation.used);
      return;

    case "turn.end": {
      const round = getEncounterRound(characterId);
      db.update(characters)
        .set({
          actionUsed: false,
          bonusActionUsed: false,
          reactionUsed: false,
          // Außerhalb eines Kampfes bleibt die 0 stehen: dann ist "Zug
          // beenden" nur das Zurücksetzen der drei Konten.
          ...(round > 0 ? { encounterRound: round + 1 } : {}),
        })
        .where(eq(characters.id, characterId))
        .run();
      return;
    }

    case "battle.start":
      // Das Log gehört dem laufenden Kampf. Beim nächsten "Roll
      // Initiative…" fängt es leer an — was bleiben soll, steht schon als
      // Zusammenfassung im Logbuch.
      db.delete(combatLog)
        .where(eq(combatLog.characterId, characterId))
        .run();
      db.update(characters)
        .set({
          encounterRound: 1,
          actionUsed: false,
          bonusActionUsed: false,
          reactionUsed: false,
        })
        .where(eq(characters.id, characterId))
        .run();
      return;

    case "battle.end":
      endBattle(characterId);
      return;

    case "slot.set":
      setSlotUsed(characterId, mutation.poolId, mutation.level, mutation.used);
      return;

    case "resource.set": {
      const row = db
        .select()
        .from(resources)
        .where(
          and(
            eq(resources.id, mutation.resourceId),
            eq(resources.characterId, characterId),
          ),
        )
        .get();
      if (!row) return;
      db.update(resources)
        .set({ current: clamp(mutation.current, 0, row.max) })
        .where(eq(resources.id, row.id))
        .run();
      return;
    }

    case "condition.set":
      if (mutation.active) {
        db.insert(activeConditions)
          .values({ characterId, conditionKey: mutation.key })
          .onConflictDoNothing()
          .run();
      } else {
        db.delete(activeConditions)
          .where(
            and(
              eq(activeConditions.characterId, characterId),
              eq(activeConditions.conditionKey, mutation.key),
            ),
          )
          .run();
      }
      return;

    case "concentration.set":
      setConcentration(
        characterId,
        mutation.spellId,
        mutation.label,
        mutation.castAtLevel,
      );
      return;

    case "concentration.clear":
      db.delete(concentration)
        .where(eq(concentration.characterId, characterId))
        .run();
      return;

    case "cast": {
      if (mutation.poolId !== null && mutation.level > 0) {
        const slot = db
          .select()
          .from(spellPoolSlots)
          .innerJoin(spellPools, eq(spellPoolSlots.poolId, spellPools.id))
          .where(
            and(
              eq(spellPoolSlots.poolId, mutation.poolId),
              eq(spellPoolSlots.level, mutation.level),
              eq(spellPools.characterId, characterId),
            ),
          )
          .get();

        // Kein freier Slot mehr: der Cast findet nicht statt. Das andere
        // Gerät war schneller, und ein stillschweigend negativer Slot wäre
        // schlimmer als ein Klick, der nichts tut.
        if (!slot || slot.spell_pool_slots.used >= slot.spell_pool_slots.total) {
          return;
        }

        db.update(spellPoolSlots)
          .set({ used: slot.spell_pool_slots.used + 1 })
          .where(eq(spellPoolSlots.id, slot.spell_pool_slots.id))
          .run();
      }

      // Ein neuer Konzentrationszauber ersetzt den alten — so wie am Tisch.
      if (mutation.concentration) {
        setConcentration(
          characterId,
          mutation.spellId,
          mutation.spellName,
          mutation.level,
        );
      }

      // Erst nachdem der Slot sicher gebucht ist: sonst stünde die Aktion
      // als verbraucht da, obwohl der Zauber nie zustande kam.
      if (isSlotCost(mutation.cost)) {
        spendSlot(characterId, mutation.cost, true);
      }
      return;
    }

    case "rest.short":
      rest(characterId, "short");
      return;

    case "rest.long":
      rest(characterId, "long");
      return;
  }
}

/* ------------------------------------------------------------------ *
 * Kampflog
 * ------------------------------------------------------------------ */

function getEncounterRound(characterId: number): number {
  return (
    db
      .select({ round: characters.encounterRound })
      .from(characters)
      .where(eq(characters.id, characterId))
      .get()?.round ?? 0
  );
}

/**
 * Schreibt eine Zeile ins Kampflog — falls überhaupt etwas Erwähnenswertes
 * passiert ist und ein Kampf läuft.
 *
 * Die Runde kommt aus dem Zustand *vor* der Änderung: sonst stünde alles,
 * was mit "Zug beenden" zusammenfällt, schon in der nächsten Runde.
 */
function record(
  characterId: number,
  mutation: LiveMutation,
  before: LiveState,
) {
  if (before.round === 0) return;

  const after = getLiveState(characterId);
  if (!after) return;

  const line = describeMutation(mutation, before, after);
  if (!line) return;

  db.insert(combatLog)
    .values({
      characterId,
      round: before.round,
      kind: line.kind,
      text: line.text,
      detail: line.detail,
      actionCost: line.actionCost,
      amount: line.amount,
      at: Math.floor(Date.now() / 1000),
    })
    .run();
}

/**
 * Kampf beenden.
 *
 * Das Log selbst bleibt stehen, damit man nach der Begegnung noch einmal
 * hineinsehen kann. Was dauerhaft bleiben soll, wandert als eine Zeile ins
 * Logbuch — dorthin, wo auch die von Hand notierten Ereignisse stehen.
 */
function endBattle(characterId: number) {
  const rounds = getEncounterRound(characterId);
  const lines = db
    .select()
    .from(combatLog)
    .where(eq(combatLog.characterId, characterId))
    .all();

  const summary = summarize(Math.max(1, rounds), lines);
  if (summary) {
    db.insert(notes)
      .values({ characterId, kind: "log", title: "", body: summary })
      .run();
  }

  db.update(characters)
    .set({
      encounterRound: 0,
      actionUsed: false,
      bonusActionUsed: false,
      reactionUsed: false,
    })
    .where(eq(characters.id, characterId))
    .run();
}

/* ------------------------------------------------------------------ *
 * Einzelne Regeln
 * ------------------------------------------------------------------ */

function changeHp(
  characterId: number,
  change: (state: HpState, hpMax: number) => HpChange,
  damage = false,
) {
  const live = getLiveState(characterId);
  if (!live) return;

  const result = change(
    { hpCurrent: live.hpCurrent, hpTemp: live.hpTemp },
    live.hpMax,
  );

  // Schaden bei 0 HP hebt die Stabilisierung auf — wer getroffen wird,
  // liegt wieder im Sterben. Heilung über 0 wischt ohnehin alles weg,
  // Wiederbelebung eingeschlossen.
  const tookDamage =
    damage || result.hpCurrent < live.hpCurrent || result.hpTemp < live.hpTemp;

  db.update(characters)
    .set({
      hpCurrent: result.hpCurrent,
      hpTemp: result.hpTemp,
      ...(result.clearDeathSaves
        ? { deathSaveSuccesses: 0, deathSaveFailures: 0, stabilized: false }
        : tookDamage
          ? { stabilized: false }
          : {}),
    })
    .where(eq(characters.id, characterId))
    .run();
}

const SLOT_COLUMN = {
  action: "actionUsed",
  bonus: "bonusActionUsed",
  reaction: "reactionUsed",
} as const;

function spendSlot(characterId: number, slot: ActionSlot, used: boolean) {
  db.update(characters)
    .set({ [SLOT_COLUMN[slot]]: used })
    .where(eq(characters.id, characterId))
    .run();
}

function setSlotUsed(
  characterId: number,
  poolId: number,
  level: number,
  used: number,
) {
  const slot = db
    .select()
    .from(spellPoolSlots)
    .innerJoin(spellPools, eq(spellPoolSlots.poolId, spellPools.id))
    .where(
      and(
        eq(spellPoolSlots.poolId, poolId),
        eq(spellPoolSlots.level, level),
        eq(spellPools.characterId, characterId),
      ),
    )
    .get();
  if (!slot) return;

  db.update(spellPoolSlots)
    .set({ used: clamp(used, 0, slot.spell_pool_slots.total) })
    .where(eq(spellPoolSlots.id, slot.spell_pool_slots.id))
    .run();
}

function setConcentration(
  characterId: number,
  spellId: number | null,
  label: string,
  castAtLevel: number,
) {
  db.insert(concentration)
    .values({
      characterId,
      spellId,
      label,
      castAtLevel,
      startedAt: Math.floor(Date.now() / 1000),
    })
    .onConflictDoUpdate({
      target: concentration.characterId,
      set: {
        spellId,
        label,
        castAtLevel,
        startedAt: Math.floor(Date.now() / 1000),
      },
    })
    .run();
}

/**
 * Rast.
 *
 * Kurze Rast: alles mit `recovery = 'short'` füllt sich auf. HP bleiben, wo
 * sie sind — die bekommt man nur über Hit Dice zurück, und wie viele man
 * ausgibt, entscheidet der Spieler selbst.
 *
 * Lange Rast: zusätzlich volle HP, keine temporären HP mehr, Death Saves
 * zurück, die Hälfte der Hit Dice zurück (aufgerundet, mindestens einer)
 * und alles mit `recovery = 'long'`.
 */
function rest(characterId: number, kind: "short" | "long") {
  // Eine lange Rast bringt auch alles zurück, was schon eine kurze erneuert.
  const recoveries: Recovery[] =
    kind === "short" ? ["short"] : ["short", "long"];

  // Wer rastet, kämpft nicht mehr. Ein verbraucht stehengebliebener Zug
  // wäre in der nächsten Begegnung eine stille Falle.
  db.update(characters)
    .set({
      actionUsed: false,
      bonusActionUsed: false,
      reactionUsed: false,
    })
    .where(eq(characters.id, characterId))
    .run();

  const pools = db
    .select()
    .from(spellPools)
    .where(
      and(
        eq(spellPools.characterId, characterId),
        inArray(spellPools.recovery, recoveries),
      ),
    )
    .all();

  if (pools.length > 0) {
    db.update(spellPoolSlots)
      .set({ used: 0 })
      .where(
        inArray(
          spellPoolSlots.poolId,
          pools.map((p) => p.id),
        ),
      )
      .run();
  }

  for (const resource of db
    .select()
    .from(resources)
    .where(
      and(
        eq(resources.characterId, characterId),
        inArray(resources.recovery, recoveries),
      ),
    )
    .all()) {
    db.update(resources)
      .set({ current: resource.max })
      .where(eq(resources.id, resource.id))
      .run();
  }

  if (kind === "long") {
    const state = getLiveState(characterId);
    db.update(characters)
      .set({
        hpCurrent: state?.hpMax ?? 0,
        hpTemp: 0,
        deathSaveSuccesses: 0,
        deathSaveFailures: 0,
        // Wer die Nacht durchschläft, wacht mit vollen HP auf — dann ist
        // "stabilisiert" kein Zustand mehr, sondern ein Rest von gestern.
        stabilized: false,
      })
      .where(eq(characters.id, characterId))
      .run();

    for (const entry of db
      .select()
      .from(characterClasses)
      .where(eq(characterClasses.characterId, characterId))
      .all()) {
      const regained = Math.max(1, Math.floor(entry.level / 2));
      db.update(characterClasses)
        .set({ hitDiceUsed: Math.max(0, entry.hitDiceUsed - regained) })
        .where(eq(characterClasses.id, entry.id))
        .run();
    }

    db.delete(concentration)
      .where(eq(concentration.characterId, characterId))
      .run();
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(Math.round(value), min), max);
}
