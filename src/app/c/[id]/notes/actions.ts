"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { db } from "@/db";
import { characters, notes } from "@/db/schema";

export async function saveBackgroundAction(
  characterId: number,
  formData: FormData,
) {
  // Nur was das Formular tatsächlich zeigt: Persönlichkeitsmerkmale,
  // Ideale, Bindungen und Makel stehen nicht mehr darin und dürfen hier
  // nicht mitgeschrieben werden — sonst leerte jedes Speichern die Werte,
  // die der Import aus dem Bogen geholt hat.
  db.update(characters)
    .set({ backstory: String(formData.get("backstory") ?? "").trim() })
    .where(eq(characters.id, characterId))
    .run();

  revalidatePath(`/c/${characterId}/notes`);
}

export async function addNoteAction(characterId: number) {
  db.insert(notes).values({ characterId, kind: "page" }).run();
  revalidatePath(`/c/${characterId}/notes`);
}

/** Ein Vermerk: kurzer Name, optional ein Satz dazu. */
export async function addPinAction(characterId: number, formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  if (!title) return;

  db.insert(notes)
    .values({
      characterId,
      kind: "pin",
      title,
      body: String(formData.get("body") ?? "").trim(),
    })
    .run();

  revalidatePath(`/c/${characterId}`, "layout");
}

/** Einen Vermerk aufheben. */
export async function resolvePinAction(characterId: number, noteId: number) {
  const pin = db.select().from(notes).where(eq(notes.id, noteId)).get();
  if (!pin || pin.characterId !== characterId) return;

  db.delete(notes).where(eq(notes.id, noteId)).run();

  revalidatePath(`/c/${characterId}`, "layout");
}

export async function saveNoteAction(characterId: number, formData: FormData) {
  const noteId = Number(formData.get("noteId"));
  if (!Number.isFinite(noteId)) return;

  db.update(notes)
    .set({
      title: String(formData.get("title") ?? "").trim() || "Ohne Titel",
      body: String(formData.get("body") ?? ""),
      updatedAt: Math.floor(Date.now() / 1000),
    })
    .where(eq(notes.id, noteId))
    .run();

  revalidatePath(`/c/${characterId}/notes`);
}

export async function removeNoteAction(characterId: number, noteId: number) {
  db.delete(notes).where(eq(notes.id, noteId)).run();
  revalidatePath(`/c/${characterId}/notes`);
}
