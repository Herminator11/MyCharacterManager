"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { db } from "@/db";
import {
  characterClasses,
  characters,
  proficiencies,
  type Ability,
} from "@/db/schema";
import { getClass } from "@/lib/rules/classes";
import {
  withoutSpeciesBonuses,
  withSpeciesBonuses,
} from "@/lib/rules/species";
import { getCharacter, refreshDerived, scoresOf } from "@/lib/server/characters";
import { createCustomSpecies, getSpecies } from "@/lib/server/species";

function refresh(characterId: number) {
  refreshDerived(characterId);
  revalidatePath(`/c/${characterId}`, "layout");
}

/**
 * Nur die Vorgeschichte. Persönlichkeitsmerkmale, Ideale, Bindungen und
 * Makel stehen bewusst nicht in diesem Formular und dürfen hier nicht
 * mitgeschrieben werden — sonst leerte jedes Speichern die Werte, die der
 * Import aus dem Bogen geholt hat.
 */
export async function saveBackgroundAction(characterId: number, backstory: string) {
  db.update(characters)
    .set({ backstory: backstory.trim() })
    .where(eq(characters.id, characterId))
    .run();

  revalidatePath(`/c/${characterId}/sheet`);
}

/**
 * Klassenhintergrund an/aus. Wirkt auf Übersicht und Bogen gleichermaßen
 * (gemeinsames Layout), deshalb `revalidatePath` auf die Layout-Ebene statt
 * nur auf `/sheet`.
 */
export async function setBackgroundThemeAction(characterId: number, enabled: boolean) {
  db.update(characters)
    .set({ backgroundThemeEnabled: enabled })
    .where(eq(characters.id, characterId))
    .run();

  revalidatePath(`/c/${characterId}`, "layout");
}

/** Größe, Gewicht, Augen-, Haut- und Haarfarbe — reiner Beschreibungstext. */
export async function saveAppearanceAction(characterId: number, appearance: string) {
  db.update(characters)
    .set({ appearance: appearance.trim() })
    .where(eq(characters.id, characterId))
    .run();

  revalidatePath(`/c/${characterId}/sheet`);
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

/* ------------------------------------------------------------------ *
 * Spezies
 * ------------------------------------------------------------------ */

/**
 * Verknüpft den Charakter mit einer Spezies — mehr nicht.
 *
 * Die Attribute bleiben unangetastet. Ein Wechsel der Spezies ist eine
 * Feststellung ("das war schon immer ein Zwerg"), keine Veränderung des
 * Charakters; wer die Boni will, drückt den Knopf daneben.
 */
export async function setSpeciesAction(characterId: number, key: string) {
  const def = key ? getSpecies(key) : null;

  db.update(characters)
    .set({
      speciesKey: def?.key ?? "",
      // Der Freitext folgt der Auswahl, damit Übersicht und Bibliothek
      // dasselbe sagen. Beim Abwählen bleibt er stehen — er kam vom
      // importierten Bogen und gehört nicht der Auswahlliste.
      ...(def ? { race: def.name } : {}),
    })
    .where(eq(characters.id, characterId))
    .run();

  refresh(characterId);
}

/**
 * Bringt die Attribute mit der gewählten Spezies in Übereinstimmung.
 *
 * Warum ein Knopf und keine Automatik: Aurora druckt die Rassenboni bereits
 * in die Werte auf dem Bogen. Würde die App sie beim Anzeigen dazurechnen,
 * stünde jeder importierte Charakter still zu stark da — und man suchte den
 * Fehler überall, nur nicht bei der Spezies.
 *
 * Warum die Buchführung in `species_bonuses_from`: ein Knopf, den zweimal
 * zu drücken doppelt zählt, ist eine Falle — die zweite Hälfte des Schadens
 * sieht man dem Charakter später nicht mehr an. Steht der Vermerk schon auf
 * dieser Spezies, passiert nichts. Steht er auf einer anderen, wird deren
 * Beitrag zuerst wieder abgezogen; danach gilt immer: was im Vermerk steht,
 * steckt genau einmal in den Werten.
 *
 * `refresh` zieht das HP-Maximum nach, wenn CON sich bewegt hat.
 */
export async function applySpeciesBonusesAction(characterId: number) {
  const character = getCharacter(characterId);
  if (!character) return;

  const def = getSpecies(character.speciesKey);
  if (!def || character.speciesBonusesFrom === def.key) return;

  // Erst zurück auf den Rohzustand — sonst stapelt ein Speziswechsel die
  // Boni der alten auf die der neuen.
  const previous = getSpecies(character.speciesBonusesFrom);
  const base = previous
    ? withoutSpeciesBonuses(scoresOf(character), previous)
    : scoresOf(character);

  db.update(characters)
    .set({
      ...withSpeciesBonuses(base, def),
      speed: def.speed,
      speciesBonusesFrom: def.key,
    })
    .where(eq(characters.id, characterId))
    .run();

  refresh(characterId);
}

/**
 * Nimmt die übernommenen Boni wieder zurück.
 *
 * Abgezogen wird genau das, was die App addiert hat — auch wenn die Werte
 * zwischendurch von Hand geändert wurden. Die Bewegungsrate bleibt stehen:
 * welcher Wert vor dem Übernehmen dort stand, weiß niemand mehr, und 30 zu
 * raten wäre schlechter als die Zahl in Ruhe zu lassen.
 */
export async function revertSpeciesBonusesAction(characterId: number) {
  const character = getCharacter(characterId);
  if (!character) return;

  const applied = getSpecies(character.speciesBonusesFrom);
  if (!applied) return;

  db.update(characters)
    .set({
      ...withoutSpeciesBonuses(scoresOf(character), applied),
      speciesBonusesFrom: "",
    })
    .where(eq(characters.id, characterId))
    .run();

  refresh(characterId);
}

/** Eigene Spezies anlegen und dem Charakter gleich zuweisen. */
export async function createSpeciesAction(
  characterId: number,
  formData: FormData,
) {
  const number = (key: string) => Number(formData.get(key) ?? 0) || 0;

  const abilityBonuses: Partial<Record<Ability, number>> = {};
  for (const ability of ["str", "dex", "con", "int", "wis", "cha"] as const) {
    const value = number(`bonus_${ability}`);
    if (value !== 0) abilityBonuses[ability] = value;
  }

  // Ein Trait je Absatz, "Name — Text". Ohne Trenner ist die ganze Zeile
  // der Name; ein Merkzettel ohne Text ist immer noch ein Merkzettel.
  const traits = String(formData.get("traits") ?? "")
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => {
      const [name, ...rest] = block.split(/\s+[—–-]\s+/);
      return { name: name.trim(), description: rest.join(" — ").trim() };
    });

  const key = createCustomSpecies({
    name: String(formData.get("name") ?? ""),
    speed: number("speed") || 30,
    size: String(formData.get("size") ?? "Medium"),
    abilityBonuses,
    traits,
    choiceNote: String(formData.get("choiceNote") ?? ""),
  });

  await setSpeciesAction(characterId, key);
}

/* ------------------------------------------------------------------ *
 * Klassen und Proficiencies
 * ------------------------------------------------------------------ */

/**
 * Die Subklasse einer Klassenzeile.
 *
 * Freitext mit Vorschlagsliste: das SRD führt genau eine je Klasse, am
 * Tisch wird jede andere gespielt. Rein beschreibend — sie leitet nichts
 * ab, weder Ressourcen noch Zauber.
 */
export async function setSubclassAction(
  characterId: number,
  classId: number,
  subclass: string,
) {
  db.update(characterClasses)
    .set({ subclass: subclass.trim() })
    .where(eq(characterClasses.id, classId))
    .run();

  revalidatePath(`/c/${characterId}`, "layout");
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

  // Layout-weit statt nur "/sheet": die Fertigkeiten- und Rettungswurf-Boni
  // stehen auch im AbilityPanel der Übersicht, sonst zeigt sie nach einem
  // Toggle hier eine Weile den alten Bonus.
  revalidatePath(`/c/${characterId}`, "layout");
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
