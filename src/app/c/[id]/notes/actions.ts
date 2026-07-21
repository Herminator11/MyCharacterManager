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
  db.insert(notes).values({ characterId }).run();
  revalidatePath(`/c/${characterId}/notes`);
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
