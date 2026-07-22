import { notFound } from "next/navigation";

import { ProficiencyToggle } from "@/components/sheet/ProficiencyToggle";
import {
  Button,
  Field,
  inputClass,
  Panel,
  SectionLabel,
} from "@/components/ui";
import { deleteCharacterAction } from "@/app/actions";
import { ABILITIES } from "@/db/schema";
import { CLASSES, className as classLabel } from "@/lib/rules/classes";
import { formatModifier } from "@/lib/rules/derive";
import { ABILITY_LABELS } from "@/lib/rules/skills";
import { getSheet } from "@/lib/server/characters";

import {
  addClassAction,
  removeClassAction,
  saveBasicsAction,
  setClassLevelAction,
  setProficiencyAction,
} from "./actions";

export const dynamic = "force-dynamic";

export default async function SheetPage({ params }: PageProps<"/c/[id]">) {
  const { id } = await params;
  const characterId = Number(id);

  const sheet = getSheet(characterId);
  if (!sheet) notFound();

  const { character } = sheet;
  const usedClassKeys = sheet.classes.map((c) => c.classKey);

  return (
    <div className="mx-auto max-w-2xl space-y-3">
      {/* Klassen zuerst: sie bestimmen Zauberplätze, Ressourcen und
          Proficiency Bonus — also alles, was darunter steht. */}
      <Panel>
        <SectionLabel
          right={
            <span className="text-xs text-mute">
              Gesamtlevel {sheet.level} · Prof {formatModifier(sheet.proficiencyBonus)}
            </span>
          }
        >
          Klassen
        </SectionLabel>

        <ul className="divide-y divide-edge">
          {sheet.classes.map((entry) => (
            <li key={entry.id} className="flex items-center gap-2 py-2">
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">
                  {classLabel(entry.classKey)}
                </span>
                <span className="block text-xs text-faint">d{entry.hitDie}</span>
              </span>

              <form
                action={async (formData: FormData) => {
                  "use server";
                  await setClassLevelAction(
                    characterId,
                    entry.id,
                    Number(formData.get("level")),
                  );
                }}
              >
                <input
                  name="level"
                  type="number"
                  min={1}
                  max={20}
                  defaultValue={entry.level}
                  aria-label={`Level ${classLabel(entry.classKey)}`}
                  className="min-h-11 w-16 rounded-md border border-edge bg-ink px-2 text-center focus:border-patina focus:outline-none"
                />
                <button type="submit" className="sr-only">
                  Level speichern
                </button>
              </form>

              {sheet.classes.length > 1 ? (
                <form
                  action={async () => {
                    "use server";
                    await removeClassAction(characterId, entry.id);
                  }}
                >
                  <button
                    type="submit"
                    aria-label={`${classLabel(entry.classKey)} entfernen`}
                    className="min-h-11 px-2 text-faint transition-colors hover:text-ember"
                  >
                    ✕
                  </button>
                </form>
              ) : null}
            </li>
          ))}
        </ul>

        <form
          action={async (formData: FormData) => {
            "use server";
            await addClassAction(characterId, formData);
          }}
          className="mt-3 flex gap-2"
        >
          <select
            name="classKey"
            defaultValue=""
            required
            className={`${inputClass} flex-1`}
          >
            <option value="" disabled>
              Klasse ergänzen…
            </option>
            {CLASSES.filter((c) => !usedClassKeys.includes(c.key)).map((c) => (
              <option key={c.key} value={c.key}>
                {c.name}
              </option>
            ))}
          </select>
          <input
            name="level"
            type="number"
            min={1}
            max={20}
            defaultValue={1}
            aria-label="Level der neuen Klasse"
            className="min-h-12 w-16 rounded-md border border-edge bg-ink px-2 text-center focus:border-patina focus:outline-none"
          />
          <Button type="submit">Hinzufügen</Button>
        </form>
        <p className="mt-2 text-xs text-faint">
          Zauberplätze und Ressourcen werden daraus abgeleitet — bei
          Multiclassing bekommt Warlock einen eigenen Pact-Magic-Pool.
        </p>
      </Panel>

      <form
        action={async (formData: FormData) => {
          "use server";
          await saveBasicsAction(characterId, formData);
        }}
        className="space-y-3"
      >
        <Panel>
          <SectionLabel>Attribute</SectionLabel>
          <div className="grid grid-cols-3 gap-2.5">
            {sheet.abilities.map((ability) => (
              <div key={ability.key}>
                <label className="block">
                  <span className="label">{ABILITY_LABELS[ability.key].name}</span>
                  <input
                    name={ability.key}
                    type="number"
                    min={1}
                    max={30}
                    defaultValue={ability.score}
                    className="mt-1 w-full min-h-12 rounded-md border border-edge bg-ink px-2 text-center text-lg font-semibold focus:border-patina focus:outline-none"
                  />
                </label>
                <p className="mt-1 text-center text-xs text-patina">
                  {formatModifier(ability.modifier)}
                </p>
              </div>
            ))}
          </div>
        </Panel>

        <Panel>
          <SectionLabel>Grunddaten</SectionLabel>
          <div className="space-y-3">
            <Field label="Name">
              <input name="name" defaultValue={character.name} className={inputClass} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Rasse">
                <input name="race" defaultValue={character.race} className={inputClass} />
              </Field>
              <Field label="Hintergrund">
                <input
                  name="background"
                  defaultValue={character.background}
                  className={inputClass}
                />
              </Field>
              <Field label="Gesinnung">
                <input
                  name="alignment"
                  defaultValue={character.alignment}
                  className={inputClass}
                />
              </Field>
              <Field label="Erfahrungspunkte">
                <input
                  name="xp"
                  type="number"
                  min={0}
                  defaultValue={character.xp}
                  className={inputClass}
                />
              </Field>
            </div>
          </div>
        </Panel>

        <Panel>
          <SectionLabel>Abgeleitete Werte</SectionLabel>
          <p className="mb-3 text-xs text-faint">
            Leer lassen heißt: automatisch berechnen. Der berechnete Wert steht
            als Platzhalter im Feld.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Max. HP">
              <input
                name="hpMaxOverride"
                type="number"
                min={1}
                defaultValue={character.hpMaxOverride ?? ""}
                placeholder={String(sheet.hpMax)}
                className={inputClass}
              />
            </Field>
            <Field label="Rüstungsklasse">
              <input
                name="acOverride"
                type="number"
                defaultValue={character.acOverride ?? ""}
                placeholder={String(sheet.armorClass)}
                className={inputClass}
              />
            </Field>
            <Field label="Initiative">
              <input
                name="initiativeOverride"
                type="number"
                defaultValue={character.initiativeOverride ?? ""}
                placeholder={formatModifier(sheet.initiative)}
                className={inputClass}
              />
            </Field>
            <Field label="Bewegungsrate">
              <input
                name="speed"
                type="number"
                min={0}
                defaultValue={character.speed}
                className={inputClass}
              />
            </Field>
            <Field label="Passive Perception">
              <input
                name="passivePerceptionOverride"
                type="number"
                defaultValue={character.passivePerceptionOverride ?? ""}
                placeholder={String(sheet.passivePerception)}
                className={inputClass}
              />
            </Field>
            <Field label="Passive Insight">
              <input
                name="passiveInsightOverride"
                type="number"
                defaultValue={character.passiveInsightOverride ?? ""}
                placeholder={String(sheet.passiveInsight)}
                className={inputClass}
              />
            </Field>
          </div>
        </Panel>

        <Button type="submit" variant="solid" size="lg" className="w-full">
          Änderungen speichern
        </Button>
      </form>

      {sheet.spellcasting ? (
        <Panel>
          <SectionLabel>Zaubern</SectionLabel>
          <dl className="grid grid-cols-3 gap-3 text-center">
            <div>
              <dd className="text-xl font-semibold">
                {ABILITY_LABELS[sheet.spellcasting.ability].name}
              </dd>
              <dt className="label mt-1">Attribut</dt>
            </div>
            <div>
              <dd className="text-xl font-semibold">{sheet.spellcasting.saveDc}</dd>
              <dt className="label mt-1">Save DC</dt>
            </div>
            <div>
              <dd className="text-xl font-semibold">
                {formatModifier(sheet.spellcasting.attackBonus)}
              </dd>
              <dt className="label mt-1">Angriff</dt>
            </div>
          </dl>
        </Panel>
      ) : null}

      <Panel>
        <SectionLabel>Rettungswürfe</SectionLabel>
        <div className="grid gap-0.5 sm:grid-cols-2">
          {sheet.abilities.map((ability) => (
            <ProficiencyToggle
              key={ability.key}
              label={ABILITY_LABELS[ability.key].de}
              sublabel={ABILITY_LABELS[ability.key].name}
              bonus={ability.save}
              level={
                sheet.proficiencies.find(
                  (p) => p.kind === "save" && p.key === ability.key,
                )?.level ?? 0
              }
              onChange={async (level) => {
                "use server";
                await setProficiencyAction(characterId, "save", ability.key, level);
              }}
            />
          ))}
        </div>
      </Panel>

      <Panel>
        <SectionLabel
          right={<span className="text-xs text-faint">Tippen wechselt durch</span>}
        >
          Fertigkeiten
        </SectionLabel>
        {/* Nach Attribut gruppiert wie auf der Übersicht und auf jedem
            gedruckten Bogen — nicht alphabetisch. Wer eine Fertigkeit
            sucht, weiß meist, woran sie hängt. CON hat keine und fällt
            dadurch von selbst heraus. */}
        {/* Spalten statt Grid: die Gruppen sind verschieden lang, und ein
            Grid ließe unter STR mit seiner einen Fertigkeit ein Loch. Der
            Spaltenfluss verteilt 18 Zeilen von selbst gleichmäßig. */}
        <div className="gap-x-6 sm:columns-2">
          {ABILITIES.map((ability) => {
            const group = sheet.skills.filter((s) => s.ability === ability);
            if (group.length === 0) return null;

            return (
              <div key={ability} className="mb-4 break-inside-avoid">
                <h3 className="label mb-1">
                  {ABILITY_LABELS[ability].name}
                  <span className="ml-2 font-normal tracking-normal normal-case">
                    {ABILITY_LABELS[ability].de}
                  </span>
                </h3>
                <div className="grid gap-0.5">
                  {group.map((skill) => (
                    <ProficiencyToggle
                      key={skill.key}
                      label={skill.name}
                      sublabel={skill.de}
                      bonus={skill.bonus}
                      level={skill.level}
                      onChange={async (level) => {
                        "use server";
                        await setProficiencyAction(
                          characterId,
                          "skill",
                          skill.key,
                          level,
                        );
                      }}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </Panel>

      <Panel>
        <SectionLabel>Charakter löschen</SectionLabel>
        <p className="text-sm text-mute">
          Entfernt {character.name} mit allen Zaubern, Ressourcen und Notizen.
          Das lässt sich nicht rückgängig machen.
        </p>
        <form action={deleteCharacterAction} className="mt-3">
          <input type="hidden" name="id" value={characterId} />
          <Button type="submit" variant="danger" className="w-full">
            Endgültig löschen
          </Button>
        </form>
      </Panel>
    </div>
  );
}
