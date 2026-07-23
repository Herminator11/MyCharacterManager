import "server-only";

import { and, asc, desc, eq, inArray } from "drizzle-orm";

import { db, sqlite } from "@/db";
import {
  activeConditions,
  attacks,
  characterClasses,
  characters,
  characterSpells,
  combatLog,
  concentration,
  inventoryItems,
  notes,
  proficiencies,
  resources,
  spellPools,
  spellPoolSlots,
  spells,
  srdConditions,
  type Ability,
} from "@/db/schema";
import { getClass } from "@/lib/rules/classes";
import {
  abilityModifier,
  baseArmorClass,
  initiative,
  passiveScore,
  savingThrow,
  skillBonus,
  spellAttackBonus,
  spellSaveDc,
  suggestedMaxHp,
  type AbilityScores,
  type ProficiencyMap,
} from "@/lib/rules/derive";
import { proficiencyBonus, totalLevel } from "@/lib/rules/multiclass";
import { SKILLS } from "@/lib/rules/skills";
import type { LiveState } from "@/lib/live-types";

import { getSpecies } from "./species";
import { pruneImportedSpells } from "./spells";
import { syncDerived } from "./sync";

/* ------------------------------------------------------------------ *
 * Laden
 * ------------------------------------------------------------------ */

export function listCharacters() {
  // Favoriten zuerst, sonst alphabetisch — die Startseite gruppiert danach
  // selbst nach Ordnern und kann sich auf diese Reihenfolge verlassen.
  const rows = db
    .select()
    .from(characters)
    .orderBy(desc(characters.favorite), asc(characters.name))
    .all();

  return rows.map((character) => {
    const classes = db
      .select()
      .from(characterClasses)
      .where(eq(characterClasses.characterId, character.id))
      .orderBy(asc(characterClasses.sortOrder))
      .all();

    return {
      ...character,
      classes,
      level: totalLevel(classes),
      hpMax: resolveMaxHp(character, classes),
    };
  });
}

export function getCharacter(id: number) {
  return db.select().from(characters).where(eq(characters.id, id)).get();
}

export function getClasses(characterId: number) {
  return db
    .select()
    .from(characterClasses)
    .where(eq(characterClasses.characterId, characterId))
    .orderBy(asc(characterClasses.sortOrder))
    .all();
}

export function getProficiencies(characterId: number) {
  return db
    .select()
    .from(proficiencies)
    .where(eq(proficiencies.characterId, characterId))
    .all();
}

export function listConditions() {
  return db
    .select()
    .from(srdConditions)
    .orderBy(asc(srdConditions.sortOrder))
    .all();
}

export function scoresOf(character: {
  str: number;
  dex: number;
  con: number;
  int: number;
  wis: number;
  cha: number;
}): AbilityScores {
  const { str, dex, con, int, wis, cha } = character;
  return { str, dex, con, int, wis, cha };
}

export function proficiencyMapOf(
  rows: readonly { kind: string; key: string; level: number; miscBonus: number }[],
): ProficiencyMap {
  return Object.fromEntries(
    rows.map((r) => [r.key, { level: r.level, miscBonus: r.miscBonus }]),
  );
}

function resolveMaxHp(
  character: { hpMaxOverride: number | null } & Parameters<typeof scoresOf>[0],
  classes: readonly { classKey: string; level: number }[],
): number {
  return character.hpMaxOverride ?? suggestedMaxHp(scoresOf(character), classes);
}

/* ------------------------------------------------------------------ *
 * Abgeleiteter Charakterbogen
 * ------------------------------------------------------------------ */

export type SheetView = ReturnType<typeof getSheet>;

export function getSheet(characterId: number) {
  const character = getCharacter(characterId);
  if (!character) return null;

  const classes = getClasses(characterId);
  const profRows = getProficiencies(characterId);
  const scores = scoresOf(character);
  const profMap = proficiencyMapOf(profRows);
  const prof = proficiencyBonus(classes);

  const abilities = (["str", "dex", "con", "int", "wis", "cha"] as const).map(
    (key) => ({
      key,
      score: scores[key],
      modifier: abilityModifier(scores[key]),
      save: savingThrow(scores, key, classes, profMap),
      proficient: (profMap[key]?.level ?? 0) > 0,
    }),
  );

  const skills = SKILLS.map((skill) => ({
    ...skill,
    bonus: skillBonus(scores, skill.key, classes, profMap),
    level: profMap[skill.key]?.level ?? 0,
  }));

  // Zauberattribut für DC/Angriff: höchststufige Casterklasse.
  const castingAbility = classes
    .filter((c) => getClass(c.classKey)?.spellcastingAbility)
    .sort((a, b) => b.level - a.level)[0];
  const castingKey = castingAbility
    ? getClass(castingAbility.classKey)!.spellcastingAbility!
    : undefined;

  return {
    character,
    classes,
    scores,
    proficiencies: profRows,
    abilities,
    skills,
    level: totalLevel(classes),
    proficiencyBonus: prof,
    // null, wenn nichts verknüpft ist oder die Verknüpfung ins Leere geht
    // (gelöschte eigene Spezies). Die Anzeige fällt dann auf `character.race`
    // zurück — den Text, der auf dem importierten Bogen stand.
    species: getSpecies(character.speciesKey),
    hpMax: resolveMaxHp(character, classes),
    armorClass: character.acOverride ?? baseArmorClass(scores),
    initiative: character.initiativeOverride ?? initiative(scores),
    passivePerception:
      character.passivePerceptionOverride ??
      passiveScore(scores, "perception", classes, profMap),
    passiveInsight:
      character.passiveInsightOverride ??
      passiveScore(scores, "insight", classes, profMap),
    spellcasting: castingKey
      ? {
          ability: castingKey as Ability,
          // Magische Foki heben beides an, deshalb überschreibbar.
          saveDc:
            character.spellSaveDcOverride ??
            spellSaveDc(scores, castingKey, classes),
          attackBonus:
            character.spellAttackOverride ??
            spellAttackBonus(scores, castingKey, classes),
        }
      : null,
  };
}

/* ------------------------------------------------------------------ *
 * Live-State
 * ------------------------------------------------------------------ */

export function getLiveState(characterId: number): LiveState | null {
  const character = getCharacter(characterId);
  if (!character) return null;

  const classes = getClasses(characterId);

  const pools = db
    .select()
    .from(spellPools)
    .where(eq(spellPools.characterId, characterId))
    .orderBy(asc(spellPools.sortOrder), asc(spellPools.id))
    .all();

  const slotRows = pools.length
    ? db
        .select()
        .from(spellPoolSlots)
        .where(
          inArray(
            spellPoolSlots.poolId,
            pools.map((p) => p.id),
          ),
        )
        .all()
    : [];

  const resourceRows = db
    .select()
    .from(resources)
    .where(eq(resources.characterId, characterId))
    .orderBy(asc(resources.sortOrder), asc(resources.id))
    .all();

  const conditionRows = db
    .select()
    .from(activeConditions)
    .where(eq(activeConditions.characterId, characterId))
    .all();

  const conc = db
    .select()
    .from(concentration)
    .where(eq(concentration.characterId, characterId))
    .get();

  // Jüngster Eintrag zuerst — so wird das Log auch gelesen. Die Obergrenze
  // hält den Live-State klein; er geht bei jeder Änderung komplett über
  // die Leitung.
  const logRows = db
    .select()
    .from(combatLog)
    .where(eq(combatLog.characterId, characterId))
    .orderBy(desc(combatLog.id))
    .limit(60)
    .all();

  return {
    characterId,
    hpCurrent: character.hpCurrent,
    hpTemp: character.hpTemp,
    hpMax: resolveMaxHp(character, classes),
    deathSaveSuccesses: character.deathSaveSuccesses,
    deathSaveFailures: character.deathSaveFailures,
    stabilized: character.stabilized,
    inspiration: character.inspiration,
    conModifier: abilityModifier(character.con),
    turn: {
      action: character.actionUsed,
      bonus: character.bonusActionUsed,
      reaction: character.reactionUsed,
    },
    round: character.encounterRound,
    log: logRows.map((row) => ({
      id: row.id,
      at: row.at,
      round: row.round,
      kind: row.kind,
      text: row.text,
      detail: row.detail,
      actionCost: row.actionCost,
    })),
    hitDice: classes.map((c) => ({
      classId: c.id,
      classKey: c.classKey,
      hitDie: c.hitDie,
      total: c.level,
      used: c.hitDiceUsed,
    })),
    pools: pools.map((pool) => ({
      id: pool.id,
      name: pool.name,
      recovery: pool.recovery,
      slots: slotRows
        .filter((s) => s.poolId === pool.id)
        .sort((a, b) => a.level - b.level)
        .map((s) => ({ level: s.level, total: s.total, used: s.used })),
    })),
    resources: resourceRows.map((r) => ({
      id: r.id,
      name: r.name,
      current: r.current,
      max: r.max,
      recovery: r.recovery,
      display: r.display,
      note: r.note,
    })),
    conditions: conditionRows.map((c) => c.conditionKey),
    concentration: conc
      ? {
          spellId: conc.spellId,
          label: conc.label,
          castAtLevel: conc.castAtLevel,
        }
      : null,
    rev: character.updatedAt,
  };
}

/* ------------------------------------------------------------------ *
 * Schreiben
 * ------------------------------------------------------------------ */

export function touch(characterId: number) {
  db.update(characters)
    .set({ updatedAt: Math.floor(Date.now() / 1000) })
    .where(eq(characters.id, characterId))
    .run();
}

export function createCharacter(input: {
  name: string;
  race?: string;
  classKey: string;
  classLevel: number;
}) {
  const def = getClass(input.classKey);

  const id = db
    .insert(characters)
    .values({ name: input.name, race: input.race ?? "" })
    .returning({ id: characters.id })
    .get().id;

  db.insert(characterClasses)
    .values({
      characterId: id,
      classKey: input.classKey,
      level: input.classLevel,
      hitDie: def?.hitDie ?? 8,
      isPrimary: true,
      sortOrder: 0,
    })
    .run();

  // Ursprungsklasse bringt zwei Rettungswurf-Proficiencies mit.
  for (const ability of def?.saves ?? []) {
    db.insert(proficiencies)
      .values({ characterId: id, kind: "save", key: ability, level: 1 })
      .onConflictDoNothing()
      .run();
  }

  refreshDerived(id);
  return id;
}

/**
 * Löscht den Charakter mit allem, was per Fremdschlüssel an ihm hängt.
 *
 * Die Kaskade endet bei character_spells — die Katalogeinträge selbst
 * überleben sie. Das ist für SRD- und selbst angelegte Zauber richtig, für
 * die Platzhalter aus dem PDF-Import aber nicht: die hätten ohne Nutzer
 * keinen Zweck mehr und würden nur die Katalogsuche zumüllen. Deshalb
 * bekommen sie hier noch einen Blick, bevor die Transaktion schließt.
 */
export function deleteCharacter(id: number) {
  const remove = sqlite.transaction(() => {
    const ownedSpellIds = db
      .select({ spellId: characterSpells.spellId })
      .from(characterSpells)
      .where(eq(characterSpells.characterId, id))
      .all()
      .map((row) => row.spellId);

    db.delete(characters).where(eq(characters.id, id)).run();

    // Erst nach dem Löschen aufräumen: bis dahin hält die eigene Zuordnung
    // jeden Zauber noch am Leben, danach zählen nur die anderen Charaktere.
    pruneImportedSpells(ownedSpellIds);
  });

  remove();
}

/**
 * Nach jeder Änderung an Klassen, Leveln oder Attributen aufrufen —
 * hält Pools und Ressourcen mit der Klassen-Progression im Einklang.
 */
export function refreshDerived(characterId: number) {
  const character = getCharacter(characterId);
  if (!character) return;

  const classes = getClasses(characterId);
  syncDerived(characterId, classes, scoresOf(character));

  // Wächst das Maximum, wachsen die aktuellen HP um dieselbe Differenz mit;
  // schrumpft es, werden sie nur nach unten geklemmt.
  const hpMax = resolveMaxHp(character, classes);
  if (hpMax !== character.hpMaxSeen) {
    const gained = Math.max(0, hpMax - character.hpMaxSeen);
    db.update(characters)
      .set({
        hpMaxSeen: hpMax,
        hpCurrent: Math.min(character.hpCurrent + gained, hpMax),
      })
      .where(eq(characters.id, characterId))
      .run();
  }

  touch(characterId);
}

/* ------------------------------------------------------------------ *
 * Weitere Listen
 * ------------------------------------------------------------------ */

export function getCharacterSpells(characterId: number) {
  return db
    .select({
      entry: characterSpells,
      spell: spells,
    })
    .from(characterSpells)
    .innerJoin(spells, eq(characterSpells.spellId, spells.id))
    .where(eq(characterSpells.characterId, characterId))
    .orderBy(asc(spells.level), asc(spells.name))
    .all();
}

export function getAttacks(characterId: number) {
  return db
    .select()
    .from(attacks)
    .where(eq(attacks.characterId, characterId))
    .orderBy(asc(attacks.sortOrder), asc(attacks.id))
    .all();
}

export function getInventory(characterId: number) {
  return db
    .select()
    .from(inventoryItems)
    .where(eq(inventoryItems.characterId, characterId))
    .orderBy(asc(inventoryItems.sortOrder), asc(inventoryItems.id))
    .all();
}

/** Die ausformulierten Seiten — das, was man überarbeitet. */
export function getNotes(characterId: number) {
  return db
    .select()
    .from(notes)
    .where(and(eq(notes.characterId, characterId), eq(notes.kind, "page")))
    .orderBy(asc(notes.updatedAt))
    .all();
}

/**
 * Was gerade gilt: Fluch, Pakt, Segen, die Vergiftung über drei Tage.
 *
 * Das sind keine 5e-Conditions — die haben Regeltext und einen Katalog.
 * Diese hier stehen in keinem Buch, und sie müssen sichtbar sein statt
 * auffindbar. Deshalb landen sie auf der Charakterseite, nicht im Archiv.
 */
export function getPins(characterId: number) {
  return db
    .select()
    .from(notes)
    .where(and(eq(notes.characterId, characterId), eq(notes.kind, "pin")))
    .orderBy(asc(notes.createdAt), asc(notes.id))
    .all();
}
