"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { db } from "@/db";
import { attacks, type Ability } from "@/db/schema";
import { ACTION_SLOTS, type ActionSlot } from "@/lib/rules/actions";

const ABILITIES = ["str", "dex", "con", "int", "wis", "cha"] as const;

function optionalNumber(formData: FormData, key: string): number | null {
  const raw = String(formData.get(key) ?? "").trim();
  return raw === "" ? null : Number(raw);
}

export async function addAttackAction(characterId: number, formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) throw new Error("Der Angriff braucht einen Namen.");

  const ability = String(formData.get("ability") ?? "str");
  const actionCost = String(formData.get("actionCost") ?? "action");

  db.insert(attacks)
    .values({
      characterId,
      name,
      ability: (ABILITIES as readonly string[]).includes(ability)
        ? (ability as Ability)
        : "str",
      actionCost: (ACTION_SLOTS as readonly string[]).includes(actionCost)
        ? (actionCost as ActionSlot)
        : "action",
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
