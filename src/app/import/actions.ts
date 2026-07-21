"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import type { ImportedCharacter } from "@/lib/import/types";
import { parseSheet, UnknownSheetFormatError } from "@/lib/import/parseSheet";
import { readPdfFields, SheetReadError } from "@/lib/import/readPdfFields";
import { importCharacter } from "@/lib/server/import";
import {
  applyReimport,
  planReimport,
  type ReimportPlan,
} from "@/lib/server/reimport";

const MAX_BYTES = 25 * 1024 * 1024;

export type ReadResult =
  | { ok: true; draft: ImportedCharacter }
  | { ok: false; error: string };

/**
 * Liest ein hochgeladenes PDF und gibt den Entwurf zurück — ohne etwas zu
 * speichern. Erst die Bestätigung legt den Charakter an.
 */
export async function readSheetAction(formData: FormData): Promise<ReadResult> {
  const file = formData.get("sheet");

  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Keine Datei ausgewählt." };
  }
  if (file.size > MAX_BYTES) {
    return {
      ok: false,
      error: `Die Datei ist ${(file.size / 1024 / 1024).toFixed(1)} MB groß. Mehr als 25 MB nimmt der Import nicht an.`,
    };
  }

  try {
    const fields = await readPdfFields(new Uint8Array(await file.arrayBuffer()));
    return { ok: true, draft: parseSheet(fields) };
  } catch (error) {
    if (
      error instanceof SheetReadError ||
      error instanceof UnknownSheetFormatError
    ) {
      return { ok: false, error: error.message };
    }
    throw error;
  }
}

/** Legt den bestätigten Entwurf als Charakter an. */
export async function commitImportAction(draftJson: string) {
  const draft = JSON.parse(draftJson) as ImportedCharacter;
  const id = importCharacter(draft);

  revalidatePath("/");
  redirect(`/c/${id}`);
}

/* ------------------------------------------------------------------ *
 * Bestehenden Charakter aktualisieren
 * ------------------------------------------------------------------ */

export type PlanResult =
  | { ok: true; plan: ReimportPlan }
  | { ok: false; error: string };

/** Vorschau: was würde sich ändern? Schreibt nichts. */
export async function planReimportAction(
  characterId: number,
  draftJson: string,
): Promise<PlanResult> {
  const plan = planReimport(characterId, JSON.parse(draftJson));
  return plan
    ? { ok: true, plan }
    : { ok: false, error: "Diesen Charakter gibt es nicht mehr." };
}

/** Übernimmt den neuen Bauplan und lässt den Spielstand stehen. */
export async function commitReimportAction(
  characterId: number,
  draftJson: string,
) {
  if (!applyReimport(characterId, JSON.parse(draftJson))) {
    throw new Error("Diesen Charakter gibt es nicht mehr.");
  }

  revalidatePath("/");
  revalidatePath(`/c/${characterId}`, "layout");
  redirect(`/c/${characterId}`);
}
