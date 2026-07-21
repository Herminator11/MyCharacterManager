"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createCharacter, deleteCharacter } from "@/lib/server/characters";
import { CLASS_KEYS } from "@/lib/rules/classes";

export async function createCharacterAction(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const classKey = String(formData.get("classKey") ?? "");
  const level = Number(formData.get("level") ?? 1);
  const race = String(formData.get("race") ?? "").trim();

  if (!name) throw new Error("Der Charakter braucht einen Namen.");
  if (!CLASS_KEYS.includes(classKey)) {
    throw new Error("Unbekannte Klasse.");
  }

  const id = createCharacter({
    name,
    race,
    classKey,
    classLevel: Math.min(Math.max(Math.round(level), 1), 20),
  });

  revalidatePath("/");
  redirect(`/c/${id}`);
}

export async function deleteCharacterAction(formData: FormData) {
  const id = Number(formData.get("id"));
  if (!Number.isFinite(id)) return;

  deleteCharacter(id);
  revalidatePath("/");
  redirect("/");
}
