/**
 * Die Rüstungsklasse in ihrer eigenen Silhouette.
 *
 * Das Schild ist die einzige Sonderform im Profilkopf und deshalb die Form,
 * die man aus zwei Metern findet, ohne zu lesen. Genau eine davon ist genug
 * — sonst wird die Reihe zum Jahrmarkt.
 *
 * Reine Anzeige: geändert wird die AC im Bogen unter „Werte“, zusammen mit
 * Initiative, Speed und den Passives. Sie ließ sich einmal hier direkt
 * antippen; das war schneller, aber es war auch die einzige Zahl auf der
 * Übersicht, die sich unter dem Finger änderte — und damit die Ausnahme,
 * die die Regel „Übersicht zeigt, Bogen ändert“ unlesbar machte.
 */
export function ArmorClassShield({ value, label }: { value: number; label: string }) {
  return (
    <div className="relative flex w-[4.5rem] shrink-0 flex-col items-center">
      <svg viewBox="0 0 44 50" aria-hidden className="h-[3.75rem] w-auto text-patina-dim">
        <path
          d="M22 2 L41 8.5 V25 C41 37 32.5 44.5 22 48 C11.5 44.5 3 37 3 25 V8.5 Z"
          fill="var(--color-panel-2)"
          stroke="currentColor"
          strokeWidth="1.5"
        />
      </svg>

      {/* In der breiten oberen Hälfte, damit die Zahl nicht an der schrägen
          Flanke klebt. */}
      <dd className="font-numeral absolute top-[0.8rem] w-11 py-0.5 text-center text-[1.375rem] leading-none font-semibold tabular-nums">
        {value}
      </dd>

      <dt className="label mt-1 text-[0.625rem]">{label}</dt>
    </div>
  );
}
