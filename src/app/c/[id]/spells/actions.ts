"use server";

import { revalidatePath } from "next/cache";

import {
  addSpellToCharacter,
  createCustomSpell,
  removeSpellFromCharacter,
  setFavorite,
  setPrepared,
} from "@/lib/server/spells";

export async function addSpellAction(characterId: number, spellId: number) {
  addSpellToCharacter(characterId, spellId);
  revalidatePath(`/c/${characterId}/spells`);
}

export async function removeSpellAction(characterId: number, spellId: number) {
  removeSpellFromCharacter(characterId, spellId);
  revalidatePath(`/c/${characterId}/spells`);
}

export async function setPreparedAction(
  characterId: number,
  spellId: number,
  prepared: boolean,
) {
  setPrepared(characterId, spellId, prepared);
  revalidatePath(`/c/${characterId}/spells`);
}

/**
 * Favoriten sind die Handvoll Zauber, die man wirklich wirft. Sie bekommen
 * im Kampfmodus eigene Knöpfe — deshalb wird hier auch die Battle-Seite
 * mit aufgefrischt.
 */
export async function setSpellFavoriteAction(
  characterId: number,
  spellId: number,
  favorite: boolean,
) {
  setFavorite(characterId, spellId, favorite);
  revalidatePath(`/c/${characterId}/spells`);
  revalidatePath(`/c/${characterId}/battle`);
}

export async function createCustomSpellAction(
  characterId: number,
  formData: FormData,
) {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) throw new Error("Der Zauber braucht einen Namen.");

  createCustomSpell(characterId, {
    name,
    level: Math.min(Math.max(Number(formData.get("level") ?? 0), 0), 9),
    school: String(formData.get("school") ?? ""),
    castingTime: String(formData.get("castingTime") ?? ""),
    range: String(formData.get("range") ?? ""),
    components: String(formData.get("components") ?? ""),
    duration: String(formData.get("duration") ?? ""),
    concentration: formData.get("concentration") === "on",
    ritual: formData.get("ritual") === "on",
    description: String(formData.get("description") ?? ""),
    higherLevel: String(formData.get("higherLevel") ?? ""),
  });

  revalidatePath(`/c/${characterId}/spells`);
}
