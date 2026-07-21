"use server";

import { revalidatePath } from "next/cache";

import { PortraitError, savePortrait } from "@/lib/server/portraits";

export async function uploadPortraitAction(
  characterId: number,
  formData: FormData,
): Promise<{ error?: string } | void> {
  const file = formData.get("portrait");
  if (!(file instanceof File)) return { error: "Keine Datei empfangen." };

  try {
    await savePortrait(characterId, file);
  } catch (error) {
    // Erwartbare Ablehnungen gehen als Text zurück an die Oberfläche;
    // alles andere darf durchschlagen und in den Logs landen.
    if (error instanceof PortraitError) return { error: error.message };
    throw error;
  }

  revalidatePath(`/c/${characterId}`, "layout");
}
