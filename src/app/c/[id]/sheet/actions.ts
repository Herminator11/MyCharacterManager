"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { db } from "@/db";
import { characterClasses, characters, proficiencies } from "@/db/schema";
import { getClass } from "@/lib/rules/classes";
import { refreshDerived } from "@/lib/server/characters";

function refresh(characterId: number) {
  refreshDerived(characterId);
  revalidatePath(`/c/${characterId}`, "layout");
}

/** Grunddaten und Attribute in einem Rutsch. */
export async function saveBasicsAction(
  characterId: number,
  formData: FormData,
) {
  const text = (key: string) => String(formData.get(key) ?? "").trim();
  const score = (key: string) =>
    Math.min(Math.max(Number(formData.get(key) ?? 10), 1), 30);
  /** Leeres Feld heißt "automatisch berechnen". */
  const optional = (key: string) => {
    const raw = String(formData.get(key) ?? "").trim();
    return raw === "" ? null : Number(raw);
  };

  db.update(characters)
    .set({
      name: text("name") || "Namenlos",
      race: text("race"),
      background: text("background"),
      alignment: text("alignment"),
      xp: Math.max(0, Number(formData.get("xp") ?? 0)),
      str: score("str"),
      dex: score("dex"),
      con: score("con"),
      int: score("int"),
      wis: score("wis"),
      cha: score("cha"),
      speed: Math.max(0, Number(formData.get("speed") ?? 30)),
      hpMaxOverride: optional("hpMaxOverride"),
      acOverride: optional("acOverride"),
      initiativeOverride: optional("initiativeOverride"),
      passivePerceptionOverride: optional("passivePerceptionOverride"),
      passiveInsightOverride: optional("passiveInsightOverride"),
    })
    .where(eq(characters.id, characterId))
    .run();

  refresh(characterId);
}

/**
 * Nur die sechs Attributswerte — für den Schnellzugriff auf der Übersicht.
 *
 * Getrennt von `saveBasicsAction`, weil die über das ganze Formular geht und
 * dabei jedes nicht mitgeschickte Feld zurücksetzen würde. Hier kommen sechs
 * Zahlen an, und sechs Zahlen werden geschrieben.
 */
export async function saveAbilityScoresAction(
  characterId: number,
  scores: Record<string, number>,
) {
  const score = (key: string) =>
    Math.min(Math.max(Math.round(Number(scores[key] ?? 10)), 1), 30);

  db.update(characters)
    .set({
      str: score("str"),
      dex: score("dex"),
      con: score("con"),
      int: score("int"),
      wis: score("wis"),
      cha: score("cha"),
    })
    .where(eq(characters.id, characterId))
    .run();

  // CON verschiebt die maximalen Trefferpunkte, das Zauberattribut den
  // Spell-DC — refreshDerived zieht beides nach.
  refresh(characterId);
}

export async function setProficiencyAction(
  characterId: number,
  kind: "save" | "skill",
  key: string,
  level: number,
) {
  db.insert(proficiencies)
    .values({ characterId, kind, key, level })
    .onConflictDoUpdate({
      target: [proficiencies.characterId, proficiencies.kind, proficiencies.key],
      set: { level },
    })
    .run();

  revalidatePath(`/c/${characterId}/sheet`);
}

export async function addClassAction(characterId: number, formData: FormData) {
  const classKey = String(formData.get("classKey") ?? "");
  const def = getClass(classKey);
  if (!def) throw new Error("Unbekannte Klasse.");

  const existing = db
    .select()
    .from(characterClasses)
    .where(eq(characterClasses.characterId, characterId))
    .all();

  if (existing.some((c) => c.classKey === classKey)) {
    throw new Error("Diese Klasse ist schon eingetragen.");
  }

  db.insert(characterClasses)
    .values({
      characterId,
      classKey,
      level: Math.min(Math.max(Number(formData.get("level") ?? 1), 1), 20),
      hitDie: def.hitDie,
      sortOrder: existing.length,
    })
    .run();

  refresh(characterId);
}

export async function setClassLevelAction(
  characterId: number,
  classId: number,
  level: number,
) {
  db.update(characterClasses)
    .set({ level: Math.min(Math.max(level, 1), 20) })
    .where(eq(characterClasses.id, classId))
    .run();

  refresh(characterId);
}

export async function removeClassAction(characterId: number, classId: number) {
  db.delete(characterClasses).where(eq(characterClasses.id, classId)).run();
  refresh(characterId);
}
