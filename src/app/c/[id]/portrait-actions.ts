"use server";

import { revalidatePath } from "next/cache";

import { getT } from "@/lib/i18n/server";
import { PortraitError, savePortrait } from "@/lib/server/portraits";

export async function uploadPortraitAction(
  characterId: number,
  formData: FormData,
): Promise<{ error?: string } | void> {
  const file = formData.get("portrait");
  const t = await getT();
  if (!(file instanceof File)) return { error: t.portrait.noFile };

  try {
    await savePortrait(characterId, file);
  } catch (error) {
    // Erwartbare Ablehnungen gehen als Text zurück an die Oberfläche;
    // alles andere darf durchschlagen und in den Logs landen.
    if (error instanceof PortraitError) {
      return {
        error:
          error.kind === "empty"
            ? t.portrait.noFile
            : error.kind === "tooLarge"
              ? t.portrait.tooLarge(t.number(error.megabytes, { maximumFractionDigits: 1 }))
              : t.portrait.wrongType,
      };
    }
    throw error;
  }

  revalidatePath(`/c/${characterId}`, "layout");
}
