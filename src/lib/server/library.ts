import "server-only";

import { asc, eq } from "drizzle-orm";

import { db, sqlite } from "@/db";
import { characters, folders } from "@/db/schema";

/**
 * Die Ablage der Startseite: Ordner, Favoriten, Umbenennen, Verschieben.
 *
 * Bewusst getrennt von `characters.ts` — dort steht, was ein Charakter *ist*,
 * hier nur, wo er liegt.
 */

export function listFolders() {
  return db
    .select()
    .from(folders)
    .orderBy(asc(folders.sortOrder), asc(folders.name))
    .all();
}

export function createFolder(name: string): number | null {
  const clean = name.trim();
  if (!clean) return null;

  return db
    .insert(folders)
    .values({ name: clean, sortOrder: Date.now() })
    .returning({ id: folders.id })
    .get().id;
}

export function renameFolder(folderId: number, name: string) {
  const clean = name.trim();
  if (!clean) return;

  db.update(folders).set({ name: clean }).where(eq(folders.id, folderId)).run();
}

/**
 * Löscht einen Ordner — nie seinen Inhalt.
 *
 * Die Charaktere werden zuerst gelöst und liegen danach lose auf der
 * Startseite. Das ist nicht nur freundlicher, es ist auch nötig: der
 * Fremdschlüssel wurde per ALTER TABLE angelegt und trägt kein
 * ON DELETE SET NULL, und `foreign_keys` ist eingeschaltet. Ohne das
 * Lösen vorab würde SQLite das Löschen schlicht verweigern.
 */
export function deleteFolder(folderId: number) {
  const remove = sqlite.transaction(() => {
    db.update(characters)
      .set({ folderId: null })
      .where(eq(characters.folderId, folderId))
      .run();

    db.delete(folders).where(eq(folders.id, folderId)).run();
  });

  remove();
}

export function setFavorite(characterId: number, favorite: boolean) {
  db.update(characters)
    .set({ favorite })
    .where(eq(characters.id, characterId))
    .run();
}

export function renameCharacter(characterId: number, name: string) {
  const clean = name.trim();
  if (!clean) return;

  db.update(characters)
    .set({ name: clean })
    .where(eq(characters.id, characterId))
    .run();
}

/** `null` legt den Charakter lose auf die Startseite zurück. */
export function moveCharacter(characterId: number, folderId: number | null) {
  // Ein unbekannter Ordner würde am Fremdschlüssel scheitern — lieber lose
  // ablegen als die Aktion mit einem Fehler abbrechen.
  const target =
    folderId !== null &&
    db.select({ id: folders.id }).from(folders).where(eq(folders.id, folderId)).get()
      ? folderId
      : null;

  db.update(characters)
    .set({ folderId: target })
    .where(eq(characters.id, characterId))
    .run();
}
