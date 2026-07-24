import { ClassIcon } from "@/components/icons";
import { CombatStats } from "@/components/profile/CombatStats";
import { KeyStat } from "@/components/profile/KeyStat";
import { Portrait } from "@/components/profile/Portrait";
import { Panel } from "@/components/ui";
import { className as classLabel } from "@/lib/rules/classes";
import { formatModifier } from "@/lib/rules/derive";
import { ABILITY_LABELS } from "@/lib/rules/skills";
import type { SheetView } from "@/lib/server/characters";

/**
 * Derselbe Blick wie im Profilkopf der Übersicht, jetzt oben auf dem Bogen:
 * was gerade gilt, bevor man in die Abschnitte springt, um es zu ändern.
 *
 * Reine Anzeige, wie auf der Übersicht auch — jeder Teil verlinkt auf den
 * Abschnitt, der ihn ändert, statt hier ein zweites Formular für dieselbe
 * Zahl zu öffnen. Live-Werte (Inspiration, Vermerke) fehlen bewusst: die
 * entstehen im Kampf und gehören auf die Übersicht, nicht in den Bogen.
 */
export function SheetSummary({ sheet }: { sheet: NonNullable<SheetView> }) {
  const { character } = sheet;

  const subtitle = [
    sheet.species?.name || character.race,
    character.background,
    character.alignment,
  ].filter(Boolean);

  return (
    <Panel className="flex flex-wrap items-start gap-4">
      <a
        href="#bild"
        className="shrink-0 transition-opacity hover:opacity-80"
        aria-label="Zum Abschnitt Bild"
      >
        <Portrait
          characterId={character.id}
          name={character.name}
          hasPortrait={Boolean(character.portraitFile)}
        />
      </a>

      <div className="flex min-w-[15rem] flex-1 flex-col justify-between gap-3">
        <div className="min-w-0">
          <h1 className="truncate text-2xl leading-tight font-semibold tracking-tight">
            {character.name}
          </h1>
          <a
            href="#klassen"
            className="mt-0.5 block truncate text-sm text-patina hover:underline"
          >
            {sheet.classes.length > 0
              ? sheet.classes.map((c, i) => (
                  <span key={`${c.classKey}-${i}`}>
                    {i > 0 ? " / " : ""}
                    <ClassIcon
                      classKey={c.classKey}
                      className="mr-1 inline-block size-3.5 align-text-bottom text-patina/70"
                    />
                    {classLabel(c.classKey)} {c.level}
                    {c.subclass ? ` (${c.subclass})` : ""}
                  </span>
                ))
              : "Ohne Klasse — antippen zum Ergänzen"}
          </a>
          {subtitle.length > 0 ? (
            <a
              href="#spezies"
              className="mt-0.5 block truncate text-xs text-faint transition-colors hover:text-patina"
            >
              {subtitle.join(" · ")}
            </a>
          ) : null}
        </div>

        <a href="#grunddaten" className="block hover:opacity-80">
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
        </a>
      </div>

      <a
        href="#werte"
        className="flex shrink-0 gap-2 transition-opacity hover:opacity-80"
        aria-label="Zum Abschnitt Werte"
      >
        <CombatStats
          armorClass={sheet.armorClass}
          initiative={formatModifier(sheet.initiative)}
          speed={character.speed}
        />
      </a>
    </Panel>
  );
}
