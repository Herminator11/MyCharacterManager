import "server-only";

import { and, eq, inArray, notInArray } from "drizzle-orm";

import { db } from "@/db";
import { resources, spellPools, spellPoolSlots } from "@/db/schema";
import type { AbilityScores } from "@/lib/rules/derive";
import { derivePools } from "@/lib/rules/derivePools";
import type { ClassLevel } from "@/lib/rules/multiclass";
import { deriveResources } from "@/lib/rules/resourceTemplates";

/**
 * Bringt die abgeleiteten Pools und Ressourcen eines Charakters mit seinen
 * Klassen und Attributen in Übereinstimmung.
 *
 * Zwei Regeln, die das Verhalten am Spieltisch bestimmen:
 *
 *  1. Alles mit `source = 'manual'` wird nicht angefasst. Wer einen Pool von
 *     Hand angelegt oder eine abgeleitete Ressource übernommen hat, behält sie.
 *  2. Verbrauch bleibt erhalten. Ein Levelaufstieg mitten in der Session gibt
 *     keine Zauberplätze zurück — `used` wird nur nach unten geklemmt, wenn
 *     das neue Maximum kleiner ist.
 */
export function syncDerived(
  characterId: number,
  classes: readonly ClassLevel[],
  scores: AbilityScores,
) {
  syncPools(characterId, classes);
  syncResources(characterId, classes, scores);
}

function syncPools(characterId: number, classes: readonly ClassLevel[]) {
  const desired = derivePools(classes);
  const desiredKeys = desired.map((p) => p.autoKey);

  const existing = db
    .select()
    .from(spellPools)
    .where(and(eq(spellPools.characterId, characterId), eq(spellPools.source, "auto")))
    .all();

  // Pools, die es nicht mehr geben soll (z.B. Warlock-Level entfernt).
  const stale = existing.filter((p) => !desiredKeys.includes(p.autoKey));
  if (stale.length > 0) {
    db.delete(spellPools)
      .where(inArray(spellPools.id, stale.map((p) => p.id)))
      .run();
  }

  for (const pool of desired) {
    const current = existing.find((p) => p.autoKey === pool.autoKey);

    const poolId = current
      ? (db
          .update(spellPools)
          .set({
            name: pool.name,
            recovery: pool.recovery,
            spellcastingAbility: pool.spellcastingAbility,
            sortOrder: pool.sortOrder,
          })
          .where(eq(spellPools.id, current.id))
          .run(),
        current.id)
      : db
          .insert(spellPools)
          .values({
            characterId,
            name: pool.name,
            autoKey: pool.autoKey,
            recovery: pool.recovery,
            spellcastingAbility: pool.spellcastingAbility,
            source: "auto",
            sortOrder: pool.sortOrder,
          })
          .returning({ id: spellPools.id })
          .get().id;

    syncPoolSlots(poolId, pool.slots);
  }
}

function syncPoolSlots(poolId: number, slots: readonly number[]) {
  const existing = db
    .select()
    .from(spellPoolSlots)
    .where(eq(spellPoolSlots.poolId, poolId))
    .all();

  const keptLevels: number[] = [];

  for (let level = 1; level <= 9; level++) {
    const total = slots[level - 1] ?? 0;
    const current = existing.find((s) => s.level === level);

    if (total <= 0) continue;
    keptLevels.push(level);

    if (current) {
      db.update(spellPoolSlots)
        .set({ total, used: Math.min(current.used, total) })
        .where(eq(spellPoolSlots.id, current.id))
        .run();
    } else {
      db.insert(spellPoolSlots)
        .values({ poolId, level, total, used: 0 })
        .run();
    }
  }

  // Grade, die der Charakter nicht mehr hat, verschwinden aus der Anzeige.
  const remove =
    keptLevels.length > 0
      ? and(
          eq(spellPoolSlots.poolId, poolId),
          notInArray(spellPoolSlots.level, keptLevels),
        )
      : eq(spellPoolSlots.poolId, poolId);
  db.delete(spellPoolSlots).where(remove).run();
}

function syncResources(
  characterId: number,
  classes: readonly ClassLevel[],
  scores: AbilityScores,
) {
  const desired = deriveResources(classes, scores);
  const desiredKeys = desired.map((r) => r.autoKey);

  const existing = db
    .select()
    .from(resources)
    .where(and(eq(resources.characterId, characterId), eq(resources.source, "auto")))
    .all();

  const stale = existing.filter((r) => !desiredKeys.includes(r.autoKey));
  if (stale.length > 0) {
    db.delete(resources)
      .where(inArray(resources.id, stale.map((r) => r.id)))
      .run();
  }

  desired.forEach((resource, index) => {
    const current = existing.find((r) => r.autoKey === resource.autoKey);

    if (current) {
      db.update(resources)
        .set({
          name: resource.name,
          max: resource.max,
          // Verbrauch bleibt stehen, nur das Maximum kann ihn beschneiden.
          current: Math.min(current.current, resource.max),
          recovery: resource.recovery,
          display: resource.display,
          note: resource.note,
          sortOrder: index,
        })
        .where(eq(resources.id, current.id))
        .run();
    } else {
      db.insert(resources)
        .values({
          characterId,
          name: resource.name,
          autoKey: resource.autoKey,
          // Neue Ressourcen starten voll.
          current: resource.max,
          max: resource.max,
          recovery: resource.recovery,
          display: resource.display,
          note: resource.note,
          source: "auto",
          sortOrder: index,
        })
        .run();
    }
  });
}
