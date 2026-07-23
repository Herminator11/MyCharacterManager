"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { db } from "@/db";
import { notes } from "@/db/schema";

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

export async function saveNoteAction(
  characterId: number,
  noteId: number,
  title: string,
  body: string,
) {
  db.update(notes)
    .set({
      title: title.trim() || "Ohne Titel",
      body,
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

/**
 * Eine Fähigkeit: Klassenmerkmal, Rassenmerkmal oder Feat, selbst
 * eingetragen. Steht auf dem Bogen, nicht bei den Notizen — sie gehört
 * zum Charakter, nicht zur Kampagne.
 */
export async function addFeatureAction(characterId: number, formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;

  db.insert(notes)
    .values({
      characterId,
      kind: "feature",
      title: name,
      body: String(formData.get("description") ?? "").trim(),
    })
    .run();

  revalidatePath(`/c/${characterId}/sheet`);
}

export async function saveFeatureAction(
  characterId: number,
  featureId: number,
  name: string,
  description: string,
) {
  db.update(notes)
    .set({
      title: name.trim() || "Ohne Namen",
      body: description,
      updatedAt: Math.floor(Date.now() / 1000),
    })
    .where(eq(notes.id, featureId))
    .run();

  revalidatePath(`/c/${characterId}/sheet`);
}

export async function removeFeatureAction(characterId: number, featureId: number) {
  db.delete(notes).where(eq(notes.id, featureId)).run();
  revalidatePath(`/c/${characterId}/sheet`);
}

/**
 * Ein Kampagnen-Log-Eintrag. Rein manuell — nur Text, das Datum setzt die
 * Datenbank. Anders als das frühere Logbuch schreibt hier nichts mehr von
 * selbst mit.
 */
export async function addCampaignLogAction(characterId: number, formData: FormData) {
  const body = String(formData.get("body") ?? "").trim();
  if (!body) return;

  db.insert(notes)
    .values({ characterId, kind: "log", title: "", body })
    .run();

  revalidatePath(`/c/${characterId}/notes/log`);
}

export async function removeCampaignLogAction(characterId: number, entryId: number) {
  db.delete(notes).where(eq(notes.id, entryId)).run();
  revalidatePath(`/c/${characterId}/notes/log`);
}
