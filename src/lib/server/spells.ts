import "server-only";

import { and, asc, eq, inArray, like, notExists, sql } from "drizzle-orm";

import { db } from "@/db";
import { characterSpells, spells } from "@/db/schema";

/** Suche im Zauber-Katalog, für das Hinzufügen zur Charakterliste. */
export function searchCatalog(options: {
  query?: string;
  level?: number;
  classKey?: string;
  limit?: number;
}) {
  const filters = [];

  if (options.query?.trim()) {
    filters.push(like(spells.name, `%${options.query.trim()}%`));
  }
  if (typeof options.level === "number") {
    filters.push(eq(spells.level, options.level));
  }
  if (options.classKey) {
    // classes ist ein JSON-Array; für die Filterung reicht ein Textvergleich.
    filters.push(like(spells.classes, `%"${options.classKey}"%`));
  }

  return db
    .select()
    .from(spells)
    .where(filters.length > 0 ? and(...filters) : undefined)
    .orderBy(asc(spells.level), asc(spells.name))
    .limit(options.limit ?? 60)
    .all();
}

export function getSpell(id: number) {
  return db.select().from(spells).where(eq(spells.id, id)).get();
}

export function addSpellToCharacter(characterId: number, spellId: number) {
  db.insert(characterSpells)
    .values({ characterId, spellId })
    .onConflictDoNothing()
    .run();
}

export function removeSpellFromCharacter(characterId: number, spellId: number) {
  db.delete(characterSpells)
    .where(
      and(
        eq(characterSpells.characterId, characterId),
        eq(characterSpells.spellId, spellId),
      ),
    )
    .run();

  pruneImportedSpells([spellId]);
}

/**
 * Entfernt Import-Platzhalter, die kein Charakter mehr führt.
 *
 * Ein Zauber mit source='imported' existiert nur, weil ein Bogen seinen Namen
 * nannte — er gehört dem Charakter, nicht dem Katalog. Bleibt er ohne Nutzer
 * zurück, taucht er weiter in der Katalogsuche auf, obwohl ihn niemand mehr
 * hat; über mehrere Import-Versuche summiert sich das.
 *
 * SRD-Zauber und von Hand angelegte ('custom') bleiben immer stehen, auch
 * ohne Nutzer: die sind absichtlich da.
 *
 * @param spellIds Kandidaten — üblicherweise die Zauber, die der gerade
 *   gelöschte Charakter geführt hat. Andere Zauber bleiben unangetastet.
 * @returns Anzahl der tatsächlich gelöschten Einträge.
 */
export function pruneImportedSpells(spellIds: readonly number[]): number {
  if (spellIds.length === 0) return 0;

  return db
    .delete(spells)
    .where(
      and(
        inArray(spells.id, [...spellIds]),
        eq(spells.source, "imported"),
        notExists(
          db
            .select({ one: sql`1` })
            .from(characterSpells)
            .where(eq(characterSpells.spellId, spells.id)),
        ),
      ),
    )
    .run().changes;
}

export function setPrepared(
  characterId: number,
  spellId: number,
  prepared: boolean,
) {
  db.update(characterSpells)
    .set({ prepared })
    .where(
      and(
        eq(characterSpells.characterId, characterId),
        eq(characterSpells.spellId, spellId),
      ),
    )
    .run();
}

export function setFavorite(
  characterId: number,
  spellId: number,
  favorite: boolean,
) {
  db.update(characterSpells)
    .set({ favorite })
    .where(
      and(
        eq(characterSpells.characterId, characterId),
        eq(characterSpells.spellId, spellId),
      ),
    )
    .run();
}

/** Legt einen eigenen Zauber an und hängt ihn direkt an den Charakter. */
export function createCustomSpell(
  characterId: number,
  input: {
    name: string;
    level: number;
    school?: string;
    castingTime?: string;
    range?: string;
    components?: string;
    duration?: string;
    concentration?: boolean;
    ritual?: boolean;
    description?: string;
    higherLevel?: string;
  },
) {
  const spellId = db
    .insert(spells)
    .values({
      // Eigene Zauber brauchen einen eindeutigen Index, damit der
      // Unique-Constraint auf (index_key, source) nicht kollidiert.
      indexKey: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: input.name,
      level: input.level,
      school: input.school ?? "",
      castingTime: input.castingTime ?? "",
      range: input.range ?? "",
      components: input.components ?? "",
      duration: input.duration ?? "",
      concentration: input.concentration ?? false,
      ritual: input.ritual ?? false,
      description: input.description ?? "",
      higherLevel: input.higherLevel ?? "",
      source: "custom",
    })
    .returning({ id: spells.id })
    .get().id;

  addSpellToCharacter(characterId, spellId);
  return spellId;
}

/** Zauber, die der Charakter noch nicht hat — für die Katalogsuche. */
export function catalogExcluding(characterId: number, options: {
  query?: string;
  level?: number;
  classKey?: string;
}) {
  const owned = db
    .select({ spellId: characterSpells.spellId })
    .from(characterSpells)
    .where(eq(characterSpells.characterId, characterId))
    .all()
    .map((r) => r.spellId);

  return searchCatalog(options).filter((s) => !owned.includes(s.id));
}

/** Wie viele Zauber der Charakter kennt, je Grad — für die Filterleiste. */
export function spellCountsByLevel(characterId: number) {
  return db
    .select({ level: spells.level, count: sql<number>`count(*)` })
    .from(characterSpells)
    .innerJoin(spells, eq(characterSpells.spellId, spells.id))
    .where(eq(characterSpells.characterId, characterId))
    .groupBy(spells.level)
    .all();
}
