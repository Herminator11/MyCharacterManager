"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { db } from "@/db";
import { characters, notes } from "@/db/schema";

export async function saveBackgroundAction(
  characterId: number,
  formData: FormData,
) {
  const text = (key: string) => String(formData.get(key) ?? "").trim();

  db.update(characters)
    .set({
      personality: text("personality"),
      ideals: text("ideals"),
      bonds: text("bonds"),
      flaws: text("flaws"),
      backstory: text("backstory"),
    })
    .where(eq(characters.id, characterId))
    .run();

  revalidatePath(`/c/${characterId}/notes`);
}

export async function addNoteAction(characterId: number) {
  db.insert(notes).values({ characterId, kind: "page" }).run();
  revalidatePath(`/c/${characterId}/notes`);
}

/**
 * Ein Logbucheintrag. Nur Text — Titel und Gliederung sind genau die
 * Hürde, an der man mitten in der Szene aufgibt und doch wieder zum Zettel
 * greift. Das Datum setzt die Datenbank.
 */
export async function addLogEntryAction(characterId: number, body: string) {
  const text = body.trim();
  if (!text) return;

  db.insert(notes)
    .values({ characterId, kind: "log", title: "", body: text })
    .run();

  // Auch die Charakterseite: dort steht der jüngste Eintrag.
  revalidatePath(`/c/${characterId}`, "layout");
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

/**
 * Einen Vermerk aufheben.
 *
 * Er wandert ins Logbuch statt gelöscht zu werden: dass ein Fluch endete,
 * ist selbst ein Ereignis, und die Frage "seit wann sind wir den los?"
 * kommt garantiert.
 */
export async function resolvePinAction(characterId: number, noteId: number) {
  const pin = db.select().from(notes).where(eq(notes.id, noteId)).get();
  if (!pin || pin.characterId !== characterId) return;

  db.update(notes)
    .set({
      kind: "log",
      title: "",
      body: `Beendet: ${pin.title}${pin.body ? ` — ${pin.body}` : ""}`,
      createdAt: Math.floor(Date.now() / 1000),
    })
    .where(eq(notes.id, noteId))
    .run();

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
