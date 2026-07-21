"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { db } from "@/db";
import { attacks, type Ability } from "@/db/schema";

const ABILITIES = ["str", "dex", "con", "int", "wis", "cha"] as const;

function optionalNumber(formData: FormData, key: string): number | null {
  const raw = String(formData.get(key) ?? "").trim();
  return raw === "" ? null : Number(raw);
}

export async function addAttackAction(characterId: number, formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) throw new Error("Der Angriff braucht einen Namen.");

  const ability = String(formData.get("ability") ?? "str");

  db.insert(attacks)
    .values({
      characterId,
      name,
      ability: (ABILITIES as readonly string[]).includes(ability)
        ? (ability as Ability)
        : "str",
      proficient: formData.get("proficient") === "on",
      attackBonusOverride: optionalNumber(formData, "attackBonusOverride"),
      damageDice: String(formData.get("damageDice") ?? "").trim(),
      damageType: String(formData.get("damageType") ?? "").trim(),
      damageBonusOverride: optionalNumber(formData, "damageBonusOverride"),
      range: String(formData.get("range") ?? "").trim(),
      notes: String(formData.get("notes") ?? "").trim(),
      sortOrder: Date.now(),
    })
    .run();

  revalidatePath(`/c/${characterId}/combat`);
}

export async function removeAttackAction(characterId: number, attackId: number) {
  db.delete(attacks).where(eq(attacks.id, attackId)).run();
  revalidatePath(`/c/${characterId}/combat`);
}
