import "server-only";

import { and, eq, inArray } from "drizzle-orm";

import { db, sqlite } from "@/db";
import {
  activeConditions,
  characterClasses,
  characters,
  concentration,
  resources,
  spellPools,
  spellPoolSlots,
  type Recovery,
} from "@/db/schema";
import type { LiveMutation, LiveState } from "@/lib/live-types";
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
    apply(characterId, mutation);
    touch(characterId);
  });

  run();
  return getLiveState(characterId);
}

function apply(characterId: number, mutation: LiveMutation) {
  switch (mutation.type) {
    case "hp.delta":
      changeHp(characterId, (state, hpMax) =>
        applyHpDelta(state, hpMax, mutation.amount),
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

    case "death.set":
      db.update(characters)
        .set({
          deathSaveSuccesses: clamp(mutation.successes, 0, 3),
          deathSaveFailures: clamp(mutation.failures, 0, 3),
        })
        .where(eq(characters.id, characterId))
        .run();
      return;

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
 * Einzelne Regeln
 * ------------------------------------------------------------------ */

function changeHp(
  characterId: number,
  change: (state: HpState, hpMax: number) => HpChange,
) {
  const live = getLiveState(characterId);
  if (!live) return;

  const result = change(
    { hpCurrent: live.hpCurrent, hpTemp: live.hpTemp },
    live.hpMax,
  );

  db.update(characters)
    .set({
      hpCurrent: result.hpCurrent,
      hpTemp: result.hpTemp,
      ...(result.clearDeathSaves
        ? { deathSaveSuccesses: 0, deathSaveFailures: 0 }
        : {}),
    })
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
