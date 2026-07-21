import "server-only";

import { eq } from "drizzle-orm";

import { db, sqlite } from "@/db";
import {
  attacks,
  characterClasses,
  characters,
  characterSpells,
  notes,
  proficiencies,
  spells,
  type Ability,
} from "@/db/schema";
import type { ImportedCharacter } from "@/lib/import/types";
import { className as classLabel } from "@/lib/rules/classes";
import { SKILLS } from "@/lib/rules/skills";

import { getLiveState, getSheet, refreshDerived } from "./characters";
import { linkSpellsFromCatalog } from "./import";

/**
 * Aktualisiert einen bestehenden Charakter aus einem neuen Bogen.
 *
 * Der Leitgedanke: **Aurora gehört der Bauplan, dem Manager der Spielstand.**
 * Der Bogen weiß, welche Klasse und welche Zauber der Charakter hat — er
 * weiß nicht, wie viele Trefferpunkte gestern übrig blieben, welche Beute
 * im Rucksack liegt und was in den Notizen steht.
 *
 * Ersetzt wird deshalb nur, was beim Levelaufstieg entsteht. Alles, was am
 * Spieltisch entsteht, bleibt unangetastet.
 */

/** Felder, die der Bogen bestimmt. */
const REPLACED = [
  "Klassen und Level",
  "Attribute",
  "Rettungswürfe und Fertigkeiten",
  "Rasse, Hintergrund, Gesinnung",
  "AC, Initiative, Bewegungsrate",
  "Maximale Trefferpunkte",
  "Zauber-DC und Angriffsbonus",
  "Zauberliste",
  "Angriffe",
] as const;

/** Felder, die der Manager behält. */
const PRESERVED = [
  "Aktuelle und temporäre Trefferpunkte",
  "Verbrauchte Zauberplätze",
  "Verbrauchte Ressourcen und Trefferwürfel",
  "Von Hand angelegte Ressourcen",
  "Conditions und Konzentration",
  "Inventar und Geldbeutel",
  "Notizen und Hintergrundtexte",
  "Portrait",
] as const;

export type DiffLine = {
  label: string;
  before: string;
  after: string;
  changed: boolean;
};

export type ReimportPlan = {
  characterId: number;
  characterName: string;
  changes: DiffLine[];
  newSpells: string[];
  removedSpells: string[];
  replaced: readonly string[];
  preserved: readonly string[];
};

/* ------------------------------------------------------------------ *
 * Vorschau
 * ------------------------------------------------------------------ */

/**
 * Rechnet aus, was ein Re-Import ändern würde — ohne etwas zu schreiben.
 */
export function planReimport(
  characterId: number,
  draft: ImportedCharacter,
): ReimportPlan | null {
  const sheet = getSheet(characterId);
  const live = getLiveState(characterId);
  if (!sheet || !live) return null;

  const changes: DiffLine[] = [];

  const line = (label: string, before: unknown, after: unknown) => {
    const b = format(before);
    const a = format(after);
    changes.push({ label, before: b, after: a, changed: b !== a });
  };

  line(
    "Klassen",
    sheet.classes
      .map((c) => `${classLabel(c.classKey)} ${c.level}`)
      .join(" / ") || "keine",
    draft.classes
      .map((c) => `${c.known ? classLabel(c.classKey) : c.rawName} ${c.level}`)
      .join(" / ") || "keine",
  );

  for (const ability of ["str", "dex", "con", "int", "wis", "cha"] as Ability[]) {
    line(ability.toUpperCase(), sheet.scores[ability], draft.scores[ability]);
  }

  line("Max. HP", live.hpMax, draft.hpMaxOverride ?? live.hpMax);
  line("AC", sheet.armorClass, draft.acOverride ?? sheet.armorClass);
  line(
    "Zauber-DC",
    sheet.spellcasting?.saveDc ?? "—",
    draft.spellSaveDcOverride ?? sheet.spellcasting?.saveDc ?? "—",
  );

  const beforeSkills = sheet.skills
    .filter((s) => s.level > 0)
    .map((s) => s.name)
    .sort();
  const afterSkills = SKILLS.filter((s) => (draft.skills[s.key] ?? 0) > 0)
    .map((s) => s.name)
    .sort();
  line("Fertigkeiten", beforeSkills.join(", ") || "keine", afterSkills.join(", ") || "keine");

  const existing = spellNamesOf(characterId);
  const incoming = new Set(draft.spells.map((s) => s.name.toLowerCase()));

  const newSpells = draft.spells
    .filter((s) => !existing.has(s.name.toLowerCase()))
    .map((s) => s.name);

  const removedSpells = [...existing.values()].filter(
    (name) => !incoming.has(name.toLowerCase()),
  );

  return {
    characterId,
    characterName: sheet.character.name,
    changes,
    newSpells,
    removedSpells,
    replaced: REPLACED,
    preserved: PRESERVED,
  };
}

/* ------------------------------------------------------------------ *
 * Anwenden
 * ------------------------------------------------------------------ */

export function applyReimport(
  characterId: number,
  draft: ImportedCharacter,
): boolean {
  if (!getSheet(characterId)) return false;

  const run = sqlite.transaction(() => {
    // Grunddaten und abgeleitete Werte: der Bogen gewinnt.
    // Inventar, Geld, Notizen und Hintergrundtexte fehlen hier bewusst.
    db.update(characters)
      .set({
        name: draft.name,
        race: draft.race,
        background: draft.background,
        alignment: draft.alignment,
        xp: draft.xp,
        str: draft.scores.str,
        dex: draft.scores.dex,
        con: draft.scores.con,
        int: draft.scores.int,
        wis: draft.scores.wis,
        cha: draft.scores.cha,
        acOverride: draft.acOverride,
        initiativeOverride: draft.initiativeOverride,
        speed: draft.speed,
        passivePerceptionOverride: draft.passivePerceptionOverride,
        passiveInsightOverride: draft.passiveInsightOverride,
        spellSaveDcOverride: draft.spellSaveDcOverride,
        spellAttackOverride: draft.spellAttackOverride,
        hpMaxOverride: draft.hpMaxOverride,
      })
      .where(eq(characters.id, characterId))
      .run();

    replaceClasses(characterId, draft);
    replaceProficiencies(characterId, draft);
    replaceAttacks(characterId, draft);
    addNewSpells(characterId, draft);
    addNewNotes(characterId, draft);

    // Zauberplätze und Klassenressourcen neu ableiten. Verbrauch bleibt
    // stehen, und die aktuellen HP wachsen um den Zugewinn mit — beides
    // steckt bereits in refreshDerived.
    refreshDerived(characterId);
  });

  run();
  return true;
}

/**
 * Klassen ersetzen, aber den Verbrauch der Trefferwürfel retten.
 *
 * Ohne das würde ein Levelaufstieg alle ausgegebenen Hit Dice zurückgeben —
 * praktisch eine geschenkte kurze Rast.
 */
function replaceClasses(characterId: number, draft: ImportedCharacter) {
  const usedByClass = new Map(
    db
      .select()
      .from(characterClasses)
      .where(eq(characterClasses.characterId, characterId))
      .all()
      .map((row) => [row.classKey, row.hitDiceUsed]),
  );

  db.delete(characterClasses)
    .where(eq(characterClasses.characterId, characterId))
    .run();

  draft.classes
    .filter((entry) => entry.classKey)
    .forEach((entry, index) => {
      db.insert(characterClasses)
        .values({
          characterId,
          classKey: entry.classKey,
          subclass: entry.subclass,
          level: entry.level,
          hitDie: entry.hitDie,
          // Auf das neue Level klemmen, falls jemand herabstuft.
          hitDiceUsed: Math.min(usedByClass.get(entry.classKey) ?? 0, entry.level),
          isPrimary: index === 0,
          sortOrder: index,
        })
        .run();
    });
}

function replaceProficiencies(characterId: number, draft: ImportedCharacter) {
  db.delete(proficiencies)
    .where(eq(proficiencies.characterId, characterId))
    .run();

  for (const [ability, level] of Object.entries(draft.saves)) {
    if (level > 0) {
      db.insert(proficiencies)
        .values({ characterId, kind: "save", key: ability, level })
        .run();
    }
  }
  for (const [skill, level] of Object.entries(draft.skills)) {
    if (level > 0) {
      db.insert(proficiencies)
        .values({ characterId, kind: "skill", key: skill, level })
        .run();
    }
  }
}

function replaceAttacks(characterId: number, draft: ImportedCharacter) {
  db.delete(attacks).where(eq(attacks.characterId, characterId)).run();

  draft.attacks.forEach((attack, index) => {
    db.insert(attacks)
      .values({
        characterId,
        name: attack.name,
        attackBonusOverride: attack.attackBonus,
        damageDice: attack.damage,
        range: attack.range,
        notes: attack.notes,
        proficient: true,
        sortOrder: index,
      })
      .run();
  });
}

/**
 * Zauber ergänzen statt ersetzen.
 *
 * Was der neue Bogen nicht mehr listet, wird trotzdem nicht gelöscht: ein
 * Wizard kann Zauber im Buch haben, die nicht vorbereitet sind, und ein
 * gelöschter Zauber nähme die Notizen daran mit. Die Vorschau nennt solche
 * Fälle, entfernen kann man sie in der Zauberliste mit einem Tipper.
 */
function addNewSpells(characterId: number, draft: ImportedCharacter) {
  if (draft.spells.length === 0) return;

  const existing = spellNamesOf(characterId);
  const fresh = draft.spells.filter(
    (spell) => !existing.has(spell.name.toLowerCase()),
  );

  if (fresh.length > 0) {
    linkSpellsFromCatalog(characterId, { ...draft, spells: fresh });
  }
}

/** Notizen nur anlegen, wenn es sie noch nicht gibt — nie überschreiben. */
function addNewNotes(characterId: number, draft: ImportedCharacter) {
  const existing = new Set(
    db
      .select({ title: notes.title })
      .from(notes)
      .where(eq(notes.characterId, characterId))
      .all()
      .map((row) => row.title.toLowerCase()),
  );

  for (const note of draft.notes) {
    if (existing.has(note.title.toLowerCase())) continue;
    db.insert(notes)
      .values({ characterId, title: note.title, body: note.body })
      .run();
  }
}

/* ------------------------------------------------------------------ *
 * Hilfsfunktionen
 * ------------------------------------------------------------------ */

/** Zaubernamen des Charakters, klein geschrieben als Schlüssel. */
function spellNamesOf(characterId: number): Map<string, string> {
  const rows = db
    .select({ name: spells.name })
    .from(characterSpells)
    .innerJoin(spells, eq(characterSpells.spellId, spells.id))
    .where(eq(characterSpells.characterId, characterId))
    .all();

  return new Map(rows.map((row) => [row.name.toLowerCase(), row.name]));
}

function format(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  return String(value);
}
