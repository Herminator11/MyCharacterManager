import { notFound } from "next/navigation";

import { BackgroundEditor } from "@/components/sheet/BackgroundEditor";
import { ClassThemeToggle } from "@/components/sheet/ClassThemeToggle";
import { FeatureEditor } from "@/components/sheet/FeatureEditor";
import { ProficiencyToggle } from "@/components/sheet/ProficiencyToggle";
import { SheetSummary } from "@/components/sheet/SheetSummary";
import { SpeciesPanel } from "@/components/species/SpeciesPanel";
import {
  Button,
  Field,
  inputClass,
  Panel,
  SectionLabel,
} from "@/components/ui";
import { ABILITIES } from "@/db/schema";
import { characterIdFromParam } from "@/lib/characterUrl";
import { CLASSES, className as classLabel } from "@/lib/rules/classes";
import { formatModifier } from "@/lib/rules/derive";
import { SUBCLASSES } from "@/lib/rules/progression.generated";
import { ABILITY_LABELS } from "@/lib/rules/skills";
import { getFeatures, getSheet } from "@/lib/server/characters";
import {
  findSpeciesByName,
  getSpecies,
  listSpecies,
} from "@/lib/server/species";

import {
  addFeatureAction,
  removeFeatureAction,
  saveFeatureAction,
} from "../notes/actions";
import { uploadPortraitAction } from "../portrait-actions";
import {
  addClassAction,
  applySpeciesBonusesAction,
  createSpeciesAction,
  removeClassAction,
  revertSpeciesBonusesAction,
  saveAppearanceAction,
  saveBackgroundAction,
  saveBasicsAction,
  setBackgroundThemeAction,
  setClassLevelAction,
  setProficiencyAction,
  setSpeciesAction,
  setSubclassAction,
} from "./actions";

export const dynamic = "force-dynamic";

/**
 * Der Bogen: die einzige Stelle, an der der Charakter geändert wird.
 *
 * Die Übersicht zeigt nur an — von der AC bis zum letzten Fertigkeitshaken
 * läuft alles hier zusammen. Das kostet auf der Übersicht ein paar kurze
 * Wege, spart aber die Frage, die jeden dieser Wege teurer machte als er
 * war: „wo war das nochmal änderbar?“ Das Portrait ist die eine bewusste
 * Ausnahme — es hängt an keinem anderen Wert und lässt sich deshalb direkt
 * im Kurzüberblick oben wechseln, hier wie auf der Übersicht.
 *
 * Der Preis ist eine lange Seite. Deshalb die Sprungmarken oben: die
 * Abschnitte stehen in fester Reihenfolge, damit man beim zweiten Mal
 * nicht mehr sucht, sondern zielt.
 *
 * Zwei Arten zu speichern, absichtlich unterschieden:
 * sofort, wo eine einzelne Geste vollständig ist oder ein Feld für sich
 * steht (Level stellen, Haken setzen, Fähigkeiten und Vorgeschichte) — und
 * per Knopf, wo mehrere Felder zusammen einen Sinn ergeben und ein halb
 * ausgefülltes Formular Unsinn wäre.
 */

/** Reihenfolge und Beschriftung der Sprungmarken — und der Abschnitte. */
const SECTIONS = [
  { id: "spezies", label: "Spezies" },
  { id: "klassen", label: "Klassen" },
  { id: "faehigkeiten", label: "Fähigkeiten" },
  { id: "aussehen", label: "Aussehen" },
  { id: "vorgeschichte", label: "Vorgeschichte" },
  { id: "grunddaten", label: "Grunddaten" },
  { id: "attribute", label: "Attribute" },
  { id: "werte", label: "Werte" },
  { id: "uebungen", label: "Übungen" },
  { id: "zaubern", label: "Zaubern" },
] as const;

export default async function SheetPage({ params }: PageProps<"/c/[id]">) {
  const { id } = await params;
  const characterId = characterIdFromParam(id);

  const sheet = getSheet(characterId);
  if (!sheet) notFound();

  const { character } = sheet;
  const usedClassKeys = sheet.classes.map((c) => c.classKey);
  const features = getFeatures(characterId);

  return (
    <div className="mx-auto max-w-2xl space-y-3">
      {/* Derselbe Blick wie oben auf der Übersicht, damit man nicht erst
          hinscrollen muss, um zu sehen, was gerade gilt — jeder Teil
          verlinkt auf den Abschnitt, der ihn ändert. */}
      <SheetSummary
        sheet={sheet}
        uploadPortrait={async (formData: FormData) => {
          "use server";
          return uploadPortraitAction(characterId, formData);
        }}
      />

      {/* Waagerecht scrollbar statt umbrechend: sieben Marken passen am
          Handy in keine Zeile, und eine zweite Zeile Navigation über einem
          Formular ist mehr Leiste als Inhalt. */}
      <nav
        aria-label="Abschnitte"
        className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        <ul className="flex w-max gap-1.5">
          {SECTIONS.map((section) => (
            <li key={section.id}>
              <a
                href={`#${section.id}`}
                className="block rounded-md border border-edge bg-panel px-3 py-1.5 text-xs text-mute transition-colors hover:border-patina hover:text-patina"
              >
                {section.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      {/* scroll-mt an jedem Abschnitt: die klebende Kopfleiste des Layouts
          liegt sonst genau auf der Überschrift, zu der man gerade
          gesprungen ist. */}
      <SpeciesPanel
        id="spezies"
        options={listSpecies().map((s) => ({
          key: s.key,
          name: s.name,
          parentKey: s.parentKey,
          custom: s.key.startsWith("custom:"),
        }))}
        current={sheet.species}
        scores={sheet.scores}
        fallbackName={sheet.species ? "" : character.race}
        suggestion={
          sheet.species ? "" : (findSpeciesByName(character.race)?.name ?? "")
        }
        onSelect={async (key: string) => {
          "use server";
          await setSpeciesAction(characterId, key);
        }}
        applied={
          Boolean(character.speciesKey) &&
          character.speciesBonusesFrom === character.speciesKey
        }
        appliedFrom={getSpecies(character.speciesBonusesFrom)}
        importedFromPdf={character.importedFromPdf}
        onApply={async () => {
          "use server";
          await applySpeciesBonusesAction(characterId);
        }}
        onRevert={async () => {
          "use server";
          await revertSpeciesBonusesAction(characterId);
        }}
        onCreate={async (formData: FormData) => {
          "use server";
          await createSpeciesAction(characterId, formData);
        }}
      />

      {/* Klassen vor allem anderen: sie bestimmen Zauberplätze, Ressourcen
          und Proficiency Bonus — also die Hälfte der Zahlen darunter. */}
      <Panel id="klassen" className="scroll-mt-24">
        <SectionLabel
          right={
            // Darf umbrechen: bei 360 px ragte der Schalter sonst 8 px
            // aus dem Panel.
            <div className="flex flex-wrap items-center justify-end gap-x-3">
              <span className="text-xs text-mute">
                Gesamtlevel {sheet.level} · Übung {formatModifier(sheet.proficiencyBonus)}
              </span>
              <ClassThemeToggle
                enabled={character.backgroundThemeEnabled}
                onChange={async (enabled) => {
                  "use server";
                  await setBackgroundThemeAction(characterId, enabled);
                }}
              />
            </div>
          }
        >
          Klassen
        </SectionLabel>

        <ul className="divide-y divide-edge">
          {sheet.classes.map((entry) => (
            <li key={entry.id} className="py-2">
              <div className="flex items-center gap-2">
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
              </div>

              {/* Subklasse als Freitext mit Vorschlägen: das SRD führt genau
                  eine je Klasse, am Tisch wird jede andere gespielt. Rein
                  beschreibend — sie leitet weder Ressourcen noch Zauber ab. */}
              <form
                action={async (formData: FormData) => {
                  "use server";
                  await setSubclassAction(
                    characterId,
                    entry.id,
                    String(formData.get("subclass") ?? ""),
                  );
                }}
                className="mt-1.5"
              >
                <input
                  name="subclass"
                  defaultValue={entry.subclass}
                  list={`subclasses-${entry.classKey}`}
                  placeholder="Subklasse — Enter speichert"
                  aria-label={`Subklasse ${classLabel(entry.classKey)}`}
                  className="min-h-11 w-full rounded-md border border-edge bg-ink px-2.5 text-sm placeholder:text-faint focus:border-patina focus:outline-none"
                />
                <button type="submit" className="sr-only">
                  Subklasse speichern
                </button>
              </form>

              <datalist id={`subclasses-${entry.classKey}`}>
                {(SUBCLASSES[entry.classKey] ?? []).map((name) => (
                  <option key={name} value={name} />
                ))}
              </datalist>
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

      {/* Kein Katalog: die App leitet kein Klassenfeature aus Klasse und
          Level ab, das wäre ein eigener Umfang wie der Zauberkatalog. Wer
          nachschlagen will, was "Sneak Attack" gerade bedeutet, trägt es
          hier einmal ein. */}
      <Panel id="faehigkeiten" className="scroll-mt-24">
        <SectionLabel>Fähigkeiten</SectionLabel>
        <p className="mb-3 text-xs text-faint">
          Klassenmerkmale, Rassenmerkmale, Feats — was du selbst
          nachschlagen willst.
        </p>

        {features.length > 0 ? (
          <ul className="divide-y divide-edge">
            {features.map((feature) => (
              <li key={feature.id} className="py-3 first:pt-0 last:pb-0">
                <FeatureEditor
                  feature={{ id: feature.id, title: feature.title, body: feature.body }}
                  save={async (name: string, description: string) => {
                    "use server";
                    await saveFeatureAction(characterId, feature.id, name, description);
                  }}
                  remove={async () => {
                    "use server";
                    await removeFeatureAction(characterId, feature.id);
                  }}
                />
              </li>
            ))}
          </ul>
        ) : null}

        <form
          action={async (formData: FormData) => {
            "use server";
            await addFeatureAction(characterId, formData);
          }}
          className={
            features.length > 0
              ? "mt-4 space-y-2 border-t border-edge pt-4"
              : "space-y-2"
          }
        >
          <input
            name="name"
            required
            placeholder="z. B. Sneak Attack"
            aria-label="Name der neuen Fähigkeit"
            className={inputClass}
          />
          <textarea
            name="description"
            rows={2}
            placeholder="Optional — kurze Beschreibung"
            aria-label="Beschreibung der neuen Fähigkeit"
            className="w-full rounded-md border border-edge bg-ink px-3 py-2 text-sm text-fg placeholder:text-faint focus:border-patina focus:outline-none"
          />
          <Button type="submit" className="w-full">
            Hinzufügen
          </Button>
        </form>
      </Panel>

      <Panel id="aussehen" className="scroll-mt-24">
        <SectionLabel>Aussehen</SectionLabel>
        <BackgroundEditor
          defaultValue={character.appearance}
          placeholder="Größe, Gewicht, Augen-, Haut- und Haarfarbe…"
          ariaLabel="Aussehen"
          save={async (appearance: string) => {
            "use server";
            await saveAppearanceAction(characterId, appearance);
          }}
        />
      </Panel>

      <Panel id="vorgeschichte" className="scroll-mt-24">
        <SectionLabel>Vorgeschichte</SectionLabel>
        <BackgroundEditor
          defaultValue={character.backstory}
          save={async (backstory: string) => {
            "use server";
            await saveBackgroundAction(characterId, backstory);
          }}
        />
      </Panel>

      {/* Ein Formular über drei Abschnitte: sie hängen zusammen. CON
          verschiebt die maximalen Trefferpunkte, DEX die Initiative — sie
          einzeln zu speichern hieße, zwischendurch einen Zustand zu
          schreiben, den niemand gemeint hat. */}
      <form
        action={async (formData: FormData) => {
          "use server";
          await saveBasicsAction(characterId, formData);
        }}
        className="space-y-3"
      >
        <Panel id="grunddaten" className="scroll-mt-24">
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
              <Field label={"Erfahrungs\u00adpunkte"}>
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

        <Panel id="attribute" className="scroll-mt-24">
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
          <p className="mt-2.5 text-xs text-faint">
            Rettungswürfe, Fertigkeiten, Zauber-DC und die maximalen
            Trefferpunkte rechnen sich neu, sobald du speicherst.
          </p>
        </Panel>

        <Panel id="werte" className="scroll-mt-24">
          <SectionLabel>Werte</SectionLabel>
          <p className="mb-3 text-xs text-faint">
            Leer lassen heißt: automatisch berechnen. Der berechnete Wert steht
            als Platzhalter im Feld. So trägt man eine AC aus Shield of Faith
            ein und nimmt sie hinterher ebenso schnell wieder zurück.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Max. Trefferpunkte">
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
            <Field label="Wahrnehmung (passiv)">
              <input
                name="passivePerceptionOverride"
                type="number"
                defaultValue={character.passivePerceptionOverride ?? ""}
                placeholder={String(sheet.passivePerception)}
                className={inputClass}
              />
            </Field>
            <Field label="Motiv erkennen (passiv)">
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

        {/* Steht am Ende seines Formulars, nicht klebend am Bildschirmrand.
            Ein mitschwebender Knopf stünde auch über den Abschnitten, die er
            nicht speichert — und benennt damit dauernd eine Zuständigkeit,
            die er dort gerade nicht hat. */}
        <Button type="submit" variant="solid" size="lg" className="w-full">
          Grunddaten, Attribute und Werte speichern
        </Button>
      </form>

      <Panel id="uebungen" className="scroll-mt-24">
        <SectionLabel
          right={<span className="text-xs text-faint">Tippen wechselt durch</span>}
        >
          Rettungswürfe
        </SectionLabel>
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

        <div className="mt-5 border-t border-edge pt-4">
          <SectionLabel>Fertigkeiten</SectionLabel>
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
        </div>
      </Panel>

      {/* Der einzige Abschnitt ohne Eingabefelder: die drei Zahlen fallen
          aus Klasse, Attribut und Proficiency ab. Überschreiben lassen sie
          sich trotzdem — aber über die Spalten, die der Import setzt, nicht
          von Hand. Steht hier, weil man sie im Bogen sucht. */}
      <Panel id="zaubern" className="scroll-mt-24">
        <SectionLabel>Zaubern</SectionLabel>
        {sheet.spellcasting ? (
          <dl className="grid grid-cols-3 gap-3 text-center">
            <div>
              <dd className="text-xl font-semibold">
                {ABILITY_LABELS[sheet.spellcasting.ability].name}
              </dd>
              <dt className="label mt-1">Attribut</dt>
            </div>
            <div>
              <dd className="text-xl font-semibold">{sheet.spellcasting.saveDc}</dd>
              <dt className="label mt-1">Zauber-SG</dt>
            </div>
            <div>
              <dd className="text-xl font-semibold">
                {formatModifier(sheet.spellcasting.attackBonus)}
              </dd>
              <dt className="label mt-1">Angriff</dt>
            </div>
          </dl>
        ) : (
          <p className="text-sm text-faint">
            Keine zaubernde Klasse eingetragen.
          </p>
        )}
      </Panel>
    </div>
  );
}
