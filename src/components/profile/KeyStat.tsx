import { cx } from "@/components/ui";
import { getT } from "@/lib/i18n/server";
import { formatModifier } from "@/lib/rules/derive";
import { ABILITY_LABELS } from "@/lib/rules/skills";
import type { SheetView } from "@/lib/server/characters";

/**
 * Eine Kennzahl mit Beschriftung — Übungsbonus, Zauber-SG und Konsorten.
 *
 * Der Wert steht immer allein und in derselben Größe; was ihn näher
 * bestimmt (das Attribut beim Zauberangriff), gehört ins Label. Als
 * kleiner grauer Anhang am Wert stand "+7 INT" sonst typografisch neben
 * den anderen Zahlen statt mit ihnen in einer Reihe.
 */
export function KeyStat({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="min-w-0">
      <dd className="font-numeral text-lg leading-none font-semibold tabular-nums">
        {value}
      </dd>
      {/* leading-snug statt der 1 aus `label`: lange Labels wie "Motiv
          erkennen (passiv)" dürfen in einer schmalen Spalte umbrechen. */}
      <dt className="label mt-1 text-[0.625rem] leading-snug">{label}</dt>
    </div>
  );
}

/**
 * Der Kennzahlenblock aus Profilkopf und Bogen-Kurzübersicht — an beiden
 * Stellen dasselbe Raster, damit dieselben Zahlen nicht an zwei Orten
 * verschieden angeordnet sind. Zwei Spalten am Handy, drei ab sm (im schmalen Bogen ab lg wieder zwei): so geht
 * es immer in vollen Reihen auf, statt 3 + 1 umzubrechen.
 *
 * Passive Wahrnehmung steht mit drin, weil die klebende Leiste sie als
 * "Wahrn." zeigt — auf der Übersicht fehlte sie bisher, die Leiste nannte
 * also eine Zahl, die man nirgends sonst fand.
 */
export async function KeyStats({
  sheet,
  className,
}: {
  sheet: NonNullable<SheetView>;
  className?: string;
}) {
  const t = await getT();
  return (
    <dl
      className={cx(
        "grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3",
        className,
      )}
    >
      <KeyStat label={t.term.proficiencyBonus} value={formatModifier(sheet.proficiencyBonus)} />
      {sheet.spellcasting ? (
        <>
          <KeyStat label={t.term.spellSaveDc} value={sheet.spellcasting.saveDc} />
          <KeyStat
            label={t.term.spellAttack(ABILITY_LABELS[sheet.spellcasting.ability].name)}
            value={formatModifier(sheet.spellcasting.attackBonus)}
          />
        </>
      ) : null}
      <KeyStat label={t.term.passivePerception} value={sheet.passivePerception} />
      <KeyStat label={t.term.passiveInsight} value={sheet.passiveInsight} />
      {sheet.character.xp > 0 ? (
        <KeyStat label={t.term.experience} value={t.number(sheet.character.xp)} />
      ) : null}
    </dl>
  );
}
