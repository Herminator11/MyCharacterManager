import { notFound } from "next/navigation";

import { ActionShape } from "@/components/icons";
import {
  Button,
  EmptyState,
  Field,
  inputClass,
  Panel,
  SectionLabel,
} from "@/components/ui";
import { characterIdFromParam } from "@/lib/characterUrl";
import { getT } from "@/lib/i18n/server";
import { ACTION_SLOTS } from "@/lib/rules/actions";
import {
  abilityModifier,
  attackBonus,
  formatModifier,
} from "@/lib/rules/derive";
import { ABILITY_LABELS } from "@/lib/rules/skills";
import { getAttacks, getInventory, getSheet } from "@/lib/server/characters";

import { addAttackAction, removeAttackAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function CombatPage({ params }: PageProps<"/c/[id]">) {
  const { id } = await params;
  const characterId = characterIdFromParam(id);

  const sheet = getSheet(characterId);
  if (!sheet) notFound();
  const t = await getT();

  const list = getAttacks(characterId);
  const equipped = getInventory(characterId).filter((item) => item.equipped);
  const attuned = equipped.filter((item) => item.attuned).length;

  return (
    <div className="mx-auto max-w-2xl space-y-3">
      {sheet.spellcasting ? (
        <Panel>
          <SectionLabel>{t.attacks.spellAttacks}</SectionLabel>
          <div className="flex gap-6">
            <p className="text-sm">
              <span className="label block">{t.term.spellSaveDc}</span>
              <span className="text-xl font-semibold">
                {sheet.spellcasting.saveDc}
              </span>
            </p>
            <p className="text-sm">
              <span className="label block">{t.attacks.attackBonus}</span>
              <span className="text-xl font-semibold">
                {formatModifier(sheet.spellcasting.attackBonus)}
              </span>
            </p>
          </div>
        </Panel>
      ) : null}

      {list.length === 0 ? (
        <EmptyState title={t.attacks.emptyTitle}>{t.attacks.emptyBody}</EmptyState>
      ) : (
        <Panel>
          <SectionLabel>{t.attacks.title}</SectionLabel>
          <ul className="divide-y divide-edge">
            {list.map((attack) => {
              const bonus =
                attack.attackBonusOverride ??
                attackBonus(
                  sheet.scores,
                  attack.ability,
                  attack.proficient,
                  sheet.classes,
                );
              const damageBonus =
                attack.damageBonusOverride ??
                abilityModifier(sheet.scores[attack.ability]);

              return (
                <li key={attack.id} className="flex items-center gap-3 py-2.5">
                  {/* Dieselbe Form wie in der Zugleiste im Kampfmodus — was
                      der Angriff kostet, erkennt man hier ohne zu lesen. */}
                  <span
                    title={t.actionCost(attack.actionCost)}
                    aria-label={t.battle.costs(t.actionCost(attack.actionCost))}
                    className="shrink-0 text-faint"
                  >
                    <ActionShape kind={attack.actionCost} className="size-3.5" />
                  </span>

                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{attack.name}</p>
                    <p className="truncate text-xs text-faint">
                      {[
                        ABILITY_LABELS[attack.ability].name,
                        attack.range,
                        attack.proficient ? t.attacks.proficient : t.attacks.notProficient,
                        attack.notes,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </div>

                  <div className="shrink-0 text-right">
                    <p className="text-lg leading-none font-semibold text-patina">
                      {formatModifier(bonus)}
                    </p>
                    <p className="mt-1 text-xs text-mute">
                      {attack.damageDice}
                      {damageBonus !== 0 ? formatModifier(damageBonus) : ""}
                      {attack.damageType ? ` ${attack.damageType}` : ""}
                    </p>
                  </div>

                  <form
                    action={async () => {
                      "use server";
                      await removeAttackAction(characterId, attack.id);
                    }}
                  >
                    <button
                      type="submit"
                      aria-label={t.attacks.remove(attack.name)}
                      className="min-h-11 min-w-11 text-faint transition-colors hover:text-ember"
                    >
                      ✕
                    </button>
                  </form>
                </li>
              );
            })}
          </ul>
        </Panel>
      )}

      {/*
        Was du trägst und was es bewirkt — hier, nicht nur im Gepäck.
        Aufgeschriebenes nützt nichts, wenn es einen Reiter entfernt liegt,
        während der Kampf läuft.
      */}
      {equipped.length > 0 ? (
        <Panel>
          <SectionLabel
            right={
              attuned > 0 ? (
                <span className="text-xs text-brass">
                  {t.attacks.attunedCount(attuned)}
                </span>
              ) : null
            }
          >
            {t.attacks.equipped}
          </SectionLabel>

          <ul className="divide-y divide-edge">
            {equipped.map((item) => (
              <li key={item.id} className="py-2">
                <p className="text-sm font-medium">
                  {item.name}
                  {item.qty > 1 ? (
                    <span className="text-faint"> ×{item.qty}</span>
                  ) : null}
                  {item.attuned ? (
                    <span className="ml-2 text-xs font-normal text-brass">
                      {t.attacks.attuned}
                    </span>
                  ) : null}
                </p>
                {item.description ? (
                  <p className="mt-0.5 text-sm whitespace-pre-line text-mute">
                    {item.description}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        </Panel>
      ) : null}

      <Panel>
        <SectionLabel>{t.attacks.addTitle}</SectionLabel>
        <form
          action={async (formData: FormData) => {
            "use server";
            await addAttackAction(characterId, formData);
          }}
          className="space-y-3"
        >
          <Field label={t.home.name}>
            <input
              name="name"
              required
              placeholder={t.common.example("Rapier")}
              className={inputClass}
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label={t.attacks.ability}>
              <select name="ability" defaultValue="dex" className={inputClass}>
                {(["str", "dex", "con", "int", "wis", "cha"] as const).map(
                  (key) => (
                    <option key={key} value={key}>
                      {ABILITY_LABELS[key].name} — {t.term.abilities[key]}
                    </option>
                  ),
                )}
              </select>
            </Field>
            <Field label={t.attacks.range}>
              <input name="range" placeholder={t.common.example("5 ft.")} className={inputClass} />
            </Field>
            <Field
              label={t.attacks.cost}
              hint={t.attacks.costHint(t.term.bonusAction)}
            >
              <select name="actionCost" defaultValue="action" className={inputClass}>
                {ACTION_SLOTS.map((slot) => (
                  <option key={slot} value={slot}>
                    {t.actionCost(slot)}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={t.attacks.damageDice}>
              <input name="damageDice" placeholder={t.common.example("1d8")} className={inputClass} />
            </Field>
            <Field label={t.attacks.damageType}>
              <input
                name="damageType"
                placeholder={t.common.example("Piercing")}
                className={inputClass}
              />
            </Field>
          </div>

          <label className="flex items-center gap-2 text-sm text-mute">
            <input
              type="checkbox"
              name="proficient"
              defaultChecked
              className="size-4 accent-[var(--color-patina)]"
            />
            {t.attacks.proficientHint(t.term.proficiencyBonus)}
          </label>

          <details>
            <summary className="cursor-pointer text-sm text-mute">
              {t.attacks.manualBonuses}
            </summary>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <Field label={t.attacks.attackBonus} hint={t.attacks.emptyMeansCompute}>
                <input
                  name="attackBonusOverride"
                  type="number"
                  className={inputClass}
                />
              </Field>
              <Field label={t.attacks.damageBonus} hint={t.attacks.emptyMeansAbility}>
                <input
                  name="damageBonusOverride"
                  type="number"
                  className={inputClass}
                />
              </Field>
            </div>
            <div className="mt-3">
              <Field label={t.attacks.note}>
                <input
                  name="notes"
                  placeholder={t.common.example("Finesse, +1")}
                  className={inputClass}
                />
              </Field>
            </div>
          </details>

          <Button type="submit" variant="solid" className="w-full">
            {t.attacks.submit}
          </Button>
        </form>
      </Panel>
    </div>
  );
}
