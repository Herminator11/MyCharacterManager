"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { characterPath } from "@/lib/characterUrl";
import { createCharacter, deleteCharacter } from "@/lib/server/characters";
import {
  createFolder,
  deleteFolder,
  moveCharacter,
  renameCharacter,
  renameFolder,
  setFavorite,
} from "@/lib/server/library";
import { CLASS_KEYS } from "@/lib/rules/classes";

export async function createCharacterAction(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const classKey = String(formData.get("classKey") ?? "");
  const level = Number(formData.get("level") ?? 1);
  const race = String(formData.get("race") ?? "").trim();

  if (!name) throw new Error("Der Charakter braucht einen Namen.");
  if (!CLASS_KEYS.includes(classKey)) {
    throw new Error("Unbekannte Klasse.");
  }

  const id = createCharacter({
    name,
    race,
    classKey,
    classLevel: Math.min(Math.max(Math.round(level), 1), 20),
  });

  revalidatePath("/");
  redirect(characterPath(id, name));
}

/**
 * Löschen gibt es nur noch von der Startseite aus.
 *
 * Vorher stand es auch unten im Charakterbogen, direkt unter den
 * Fertigkeiten — an einer Stelle also, an der man scrollt, während der
 * Abend läuft. Ein Charakter mit Monaten Spielstand gehört nicht neben
 * ein Formularfeld.
 */
export async function deleteCharacterAction(characterId: number) {
  deleteCharacter(characterId);
  revalidatePath("/");
}

/* ------------------------------------------------------------------ *
 * Ablage
 * ------------------------------------------------------------------ */

export async function setFavoriteAction(
  characterId: number,
  favorite: boolean,
) {
  setFavorite(characterId, favorite);
  revalidatePath("/");
}

export async function renameCharacterAction(characterId: number, name: string) {
  renameCharacter(characterId, name);
  revalidatePath("/");
  // Der Name steht auch in der Statusleiste jeder Charakterseite.
  revalidatePath(`/c/${characterId}`, "layout");
}

export async function moveCharacterAction(
  characterId: number,
  folderId: number | null,
) {
  moveCharacter(characterId, folderId);
  revalidatePath("/");
}

export async function createFolderAction(name: string) {
  createFolder(name);
  revalidatePath("/");
}

export async function renameFolderAction(folderId: number, name: string) {
  renameFolder(folderId, name);
  revalidatePath("/");
}

export async function deleteFolderAction(folderId: number) {
  deleteFolder(folderId);
  revalidatePath("/");
}
