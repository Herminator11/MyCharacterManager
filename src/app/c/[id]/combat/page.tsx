import { notFound } from "next/navigation";

import {
  Button,
  EmptyState,
  Field,
  inputClass,
  Panel,
  SectionLabel,
} from "@/components/ui";
import {
  abilityModifier,
  attackBonus,
  formatModifier,
} from "@/lib/rules/derive";
import { ABILITY_LABELS } from "@/lib/rules/skills";
import { getAttacks, getSheet } from "@/lib/server/characters";

import { addAttackAction, removeAttackAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function CombatPage({ params }: PageProps<"/c/[id]">) {
  const { id } = await params;
  const characterId = Number(id);

  const sheet = getSheet(characterId);
  if (!sheet) notFound();

  const list = getAttacks(characterId);

  return (
    <div className="mx-auto max-w-2xl space-y-3">
      {sheet.spellcasting ? (
        <Panel>
          <SectionLabel>Zauberangriffe</SectionLabel>
          <div className="flex gap-6">
            <p className="text-sm">
              <span className="label block">Save DC</span>
              <span className="text-xl font-semibold">
                {sheet.spellcasting.saveDc}
              </span>
            </p>
            <p className="text-sm">
              <span className="label block">Angriffsbonus</span>
              <span className="text-xl font-semibold">
                {formatModifier(sheet.spellcasting.attackBonus)}
              </span>
            </p>
          </div>
        </Panel>
      ) : null}

      {list.length === 0 ? (
        <EmptyState title="Noch keine Waffen eingetragen.">
          Trag unten deine Waffen ein — Angriffs- und Schadensbonus rechnet die
          App aus Attribut und Übung aus.
        </EmptyState>
      ) : (
        <Panel>
          <SectionLabel>Angriffe</SectionLabel>
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
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{attack.name}</p>
                    <p className="truncate text-xs text-faint">
                      {[
                        ABILITY_LABELS[attack.ability].name,
                        attack.range,
                        attack.proficient ? "geübt" : "ungeübt",
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
                      aria-label={`${attack.name} entfernen`}
                      className="min-h-11 px-1 text-faint transition-colors hover:text-ember"
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

      <Panel>
        <SectionLabel>Angriff hinzufügen</SectionLabel>
        <form
          action={async (formData: FormData) => {
            "use server";
            await addAttackAction(characterId, formData);
          }}
          className="space-y-3"
        >
          <Field label="Name">
            <input
              name="name"
              required
              placeholder="Rapier"
              className={inputClass}
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Attribut">
              <select name="ability" defaultValue="dex" className={inputClass}>
                {(["str", "dex", "con", "int", "wis", "cha"] as const).map(
                  (key) => (
                    <option key={key} value={key}>
                      {ABILITY_LABELS[key].name} — {ABILITY_LABELS[key].de}
                    </option>
                  ),
                )}
              </select>
            </Field>
            <Field label="Reichweite">
              <input name="range" placeholder="5 ft." className={inputClass} />
            </Field>
            <Field label="Schadenswürfel">
              <input name="damageDice" placeholder="1d8" className={inputClass} />
            </Field>
            <Field label="Schadensart">
              <input
                name="damageType"
                placeholder="Piercing"
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
            Geübt — Proficiency Bonus zählt zum Angriff
          </label>

          <details>
            <summary className="cursor-pointer text-sm text-mute">
              Boni von Hand setzen
            </summary>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <Field label="Angriffsbonus" hint="Leer = berechnen">
                <input
                  name="attackBonusOverride"
                  type="number"
                  className={inputClass}
                />
              </Field>
              <Field label="Schadensbonus" hint="Leer = Attribut">
                <input
                  name="damageBonusOverride"
                  type="number"
                  className={inputClass}
                />
              </Field>
            </div>
            <div className="mt-3">
              <Field label="Notiz">
                <input
                  name="notes"
                  placeholder="Finesse, +1 magisch"
                  className={inputClass}
                />
              </Field>
            </div>
          </details>

          <Button type="submit" variant="solid" className="w-full">
            Angriff hinzufügen
          </Button>
        </form>
      </Panel>
    </div>
  );
}
