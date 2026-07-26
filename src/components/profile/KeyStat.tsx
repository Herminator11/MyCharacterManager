/**
 * Eine Kennzahl mit Beschriftung — Proficiency, Spell DC und Konsorten.
 *
 * Eigene Datei, weil sie an zwei Stellen mit demselben Aussehen steht: im
 * Profilkopf der Übersicht und in der Kurzübersicht oben auf dem Bogen.
 */
export function KeyStat({
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
      <dd className="font-numeral text-lg leading-none font-semibold tabular-nums">
        {value}
        {hint ? (
          <span className="ml-1 text-xs font-normal text-faint">{hint}</span>
        ) : null}
      </dd>
      <dt className="label mt-1 text-[0.5625rem]">{label}</dt>
    </div>
  );
}
