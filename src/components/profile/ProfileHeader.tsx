import { CombatStats } from "@/components/profile/CombatStats";
import { PortraitUpload } from "@/components/profile/PortraitUpload";
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
 */
export function ProfileHeader({
  sheet,
  uploadPortrait,
}: {
  sheet: NonNullable<SheetView>;
  uploadPortrait: (formData: FormData) => Promise<{ error?: string } | void>;
}) {
  const { character } = sheet;

  const subtitle = [
    character.race,
    character.background,
    character.alignment,
  ].filter(Boolean);

  return (
    <Panel className="flex flex-wrap items-start gap-4">
      <PortraitUpload
        characterId={character.id}
        name={character.name}
        hasPortrait={Boolean(character.portraitFile)}
        upload={uploadPortrait}
      />

      <div className="flex min-w-0 flex-1 flex-col justify-between gap-3">
        <div className="min-w-0">
          <h1 className="truncate text-2xl leading-tight font-semibold tracking-tight">
            {character.name}
          </h1>
          <p className="mt-0.5 truncate text-sm text-patina">
            {sheet.classes.length > 0
              ? sheet.classes
                  .map((c) => `${classLabel(c.classKey)} ${c.level}`)
                  .join(" / ")
              : "Ohne Klasse"}
            {sheet.classes.length > 1 ? (
              <span className="text-faint"> · Gesamtlevel {sheet.level}</span>
            ) : null}
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

      <CombatStats
        armorClass={sheet.armorClass}
        initiative={formatModifier(sheet.initiative)}
        speed={character.speed}
      />
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
