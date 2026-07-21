"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { db } from "@/db";
import { characters, inventoryItems } from "@/db/schema";

/**
 * Gepäck und Kampfseite zusammen auffrischen: was du anlegst, steht auch
 * unter „Angriffe“, damit die Wirkung dort sichtbar ist, wo sie zählt.
 */
function refresh(characterId: number) {
  revalidatePath(`/c/${characterId}/inventory`);
  revalidatePath(`/c/${characterId}/combat`);
}

export async function addItemAction(characterId: number, formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) throw new Error("Der Gegenstand braucht einen Namen.");

  db.insert(inventoryItems)
    .values({
      characterId,
      name,
      qty: Math.max(1, Number(formData.get("qty") ?? 1)),
      weight: Math.max(0, Number(formData.get("weight") ?? 0)),
      // Eingabe in Gold, gespeichert in Kupfer — hält Summen ganzzahlig.
      valueCp: Math.round(Math.max(0, Number(formData.get("valueGp") ?? 0)) * 100),
      equipped: formData.get("equipped") === "on",
      requiresAttunement: formData.get("requiresAttunement") === "on",
      description: String(formData.get("description") ?? "").trim(),
      sortOrder: Date.now(),
    })
    .run();

  refresh(characterId);
}

export async function setItemQtyAction(
  characterId: number,
  itemId: number,
  qty: number,
) {
  if (qty <= 0) {
    db.delete(inventoryItems).where(eq(inventoryItems.id, itemId)).run();
  } else {
    db.update(inventoryItems)
      .set({ qty })
      .where(eq(inventoryItems.id, itemId))
      .run();
  }
  refresh(characterId);
}

export async function toggleEquippedAction(
  characterId: number,
  itemId: number,
  equipped: boolean,
) {
  db.update(inventoryItems)
    .set({ equipped })
    .where(eq(inventoryItems.id, itemId))
    .run();
  refresh(characterId);
}

/**
 * Einstimmung umschalten.
 *
 * Drei gleichzeitig sind das Limit — die App zeigt den Stand an, sperrt
 * aber nicht: es gibt Klassenmerkmale, die mehr erlauben, und ein DM, der
 * eine Ausnahme macht, hat immer recht.
 */
export async function toggleAttunedAction(
  characterId: number,
  itemId: number,
  attuned: boolean,
) {
  db.update(inventoryItems)
    .set({ attuned })
    .where(eq(inventoryItems.id, itemId))
    .run();
  refresh(characterId);
}

/** Wirkungstext ändern — für Homebrew und angepasste Standardgegenstände. */
export async function saveItemDescriptionAction(
  characterId: number,
  itemId: number,
  description: string,
) {
  db.update(inventoryItems)
    .set({ description: description.trim() })
    .where(eq(inventoryItems.id, itemId))
    .run();
  refresh(characterId);
}

export async function removeItemAction(characterId: number, itemId: number) {
  db.delete(inventoryItems).where(eq(inventoryItems.id, itemId)).run();
  refresh(characterId);
}

export async function savePurseAction(characterId: number, formData: FormData) {
  const coin = (key: string) =>
    Math.max(0, Math.round(Number(formData.get(key) ?? 0)));

  db.update(characters)
    .set({
      cp: coin("cp"),
      sp: coin("sp"),
      ep: coin("ep"),
      gp: coin("gp"),
      pp: coin("pp"),
    })
    .where(eq(characters.id, characterId))
    .run();

  revalidatePath(`/c/${characterId}/inventory`);
}
