"use server";

import { eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { db } from "@/db";
import { characters, notes } from "@/db/schema";

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
 * selbst mit. Trägt die aktuelle Session-Nummer, damit man hinterher weiß,
 * in welcher Session etwas passiert ist, nicht nur an welchem Tag.
 */
export async function addCampaignLogAction(characterId: number, formData: FormData) {
  const body = String(formData.get("body") ?? "").trim();
  if (!body) return;

  const character = db
    .select({ currentSession: characters.currentSession })
    .from(characters)
    .where(eq(characters.id, characterId))
    .get();

  db.insert(notes)
    .values({
      characterId,
      kind: "log",
      title: "",
      body,
      session: character?.currentSession || null,
    })
    .run();

  revalidatePath(`/c/${characterId}/notes`);
}

export async function removeCampaignLogAction(characterId: number, entryId: number) {
  db.delete(notes).where(eq(notes.id, entryId)).run();
  revalidatePath(`/c/${characterId}/notes`);
}

/**
 * Nächste Session beginnt — von Hand angestoßen, nicht aus dem Kalender
 * abgeleitet. Neue Log-Einträge übernehmen die neue Zahl ab sofort; ältere
 * Einträge bleiben bei der Nummer, mit der sie entstanden sind.
 */
export async function bumpSessionAction(characterId: number) {
  db.update(characters)
    .set({ currentSession: sql`${characters.currentSession} + 1` })
    .where(eq(characters.id, characterId))
    .run();

  revalidatePath(`/c/${characterId}/notes`);
}
