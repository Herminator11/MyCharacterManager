import { PinButton } from "@/components/notes/PinButton";
import { PROFILE_ANCHOR_ID } from "@/components/StickyStats";
import { CombatStats } from "@/components/profile/CombatStats";
import { InspirationToggle } from "@/components/profile/InspirationToggle";
import { Portrait } from "@/components/profile/Portrait";
import { Panel } from "@/components/ui";
import { className as classLabel } from "@/lib/rules/classes";
import { formatModifier } from "@/lib/rules/derive";
import { ABILITY_LABELS } from "@/lib/rules/skills";
import type { SheetView } from "@/lib/server/characters";

/**
 * Der Kopf der Charakterseite: wer das ist und was dauerhaft für ihn gilt.
 *
 * Rechts stehen die drei Werte, die im Kampf laut genannt werden — AC,
 * Initiative, Speed — als eigene Instrumente. Die klebende Leiste darüber
 * zeigt dieselben Zahlen noch einmal klein; das ist keine Dopplung, sondern
 * Arbeitsteilung: hier liest man sie, dort behält man sie beim Scrollen.
 *
 * Nichts davon ist hier änderbar. Was zum Charakter gehört, wird im Bogen
 * geändert; auf dieser Seite ändert sich nur, was der Kampf ändert.
 * Ausgenommen bleiben die Vermerke und das Logbuch — das sind Notizen, keine
 * Werte, und sie entstehen mitten im Spiel.
 */
export function ProfileHeader({
  sheet,
  pinCount,
  addPin,
}: {
  sheet: NonNullable<SheetView>;
  pinCount: number;
  addPin: (formData: FormData) => Promise<void>;
}) {
  const { character } = sheet;

  const subtitle = [
    // Der Katalogname gewinnt, wenn eine Spezies verknüpft ist: er ist der,
    // unter dem auch die Traits darunter stehen. Ohne Verknüpfung bleibt der
    // Text vom importierten Bogen — „Variant Human (Custom)" sagt mehr als
    // gar nichts.
    sheet.species?.name || character.race,
    character.background,
    character.alignment,
  ].filter(Boolean);

  return (
    <Panel className="relative flex flex-wrap items-start gap-4 pr-14">
      <Portrait
        characterId={character.id}
        name={character.name}
        hasPortrait={Boolean(character.portraitFile)}
        className="shrink-0"
      />

      {/* Mindestbreite, damit die Instrumente rechts lieber in eine eigene
          Zeile rutschen, als Namen und Kennzahlen zusammenzuquetschen. */}
      <div className="flex min-w-[15rem] flex-1 flex-col justify-between gap-3">
        <div className="min-w-0">
          <h1 className="truncate text-2xl leading-tight font-semibold tracking-tight">
            {character.name}
          </h1>
          <p className="mt-0.5 truncate text-sm text-patina">
            {/* Subklasse in Klammern hinter dem Level: sie beantwortet die
                Frage „was für ein Warlock", und die stellt am Tisch jeder
                zuerst. Fehlt sie, fehlt nur die Klammer. */}
            {sheet.classes.length > 0
              ? sheet.classes
                  .map(
                    (c) =>
                      `${classLabel(c.classKey)} ${c.level}` +
                      (c.subclass ? ` (${c.subclass})` : ""),
                  )
                  .join(" / ")
              : "Ohne Klasse"}
          </p>
          {subtitle.length > 0 ? (
            <p className="mt-0.5 truncate text-xs text-faint">
              {subtitle.join(" · ")}
            </p>
          ) : null}
        </div>

        <dl className="flex flex-wrap gap-x-5 gap-y-2.5">
          <KeyStat
            label="Proficiency"
            value={formatModifier(sheet.proficiencyBonus)}
          />
          {sheet.spellcasting ? (
            <>
              <KeyStat label="Spell DC" value={sheet.spellcasting.saveDc} />
              <KeyStat
                label="Zauberangriff"
                value={formatModifier(sheet.spellcasting.attackBonus)}
                hint={ABILITY_LABELS[sheet.spellcasting.ability].name}
              />
            </>
          ) : null}
          <KeyStat label="Passive Insight" value={sheet.passiveInsight} />
          {character.xp > 0 ? (
            <KeyStat label="XP" value={character.xp.toLocaleString("de-DE")} />
          ) : null}
        </dl>
      </div>

      {/* Anker für die klebende Leiste: solange dieser Block sichtbar
          ist, hält sie ihre Zahlen zurück. */}
      <div id={PROFILE_ANCHOR_ID} className="flex shrink-0 gap-2">
        <CombatStats
          armorClass={sheet.armorClass}
          initiative={formatModifier(sheet.initiative)}
          speed={character.speed}
        />
      </div>

      {/* Zwei Ecken statt einer Reihe: Inspiration oben, Vermerk unten,
          beide unauffällig am rechten Rand. Weder das eine noch das andere
          ist ein Kampfwert wie AC oder Speed — sie sollen da sein, ohne mit
          den Instrumenten um Aufmerksamkeit zu konkurrieren. Das `pr-14`
          oben am Panel hält diese Ecke frei, damit die Instrumentenreihe
          nicht darunter verschwindet. */}
      <InspirationToggle className="absolute top-3 right-3" />
      <PinButton count={pinCount} add={addPin} />
    </Panel>
  );
}

function KeyStat({
  label,
  value,
  hint,
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
}) {
  return (
    <div>
      <dd className="text-lg leading-none font-semibold tabular-nums">
        {value}
        {hint ? (
          <span className="ml-1 text-xs font-normal text-faint">{hint}</span>
        ) : null}
      </dd>
      <dt className="label mt-1 text-[0.5625rem]">{label}</dt>
    </div>
  );
}
