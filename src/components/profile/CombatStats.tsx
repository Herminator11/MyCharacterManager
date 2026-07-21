import type { ReactNode } from "react";

/**
 * Rüstungsklasse, Initiative und Bewegungsrate als Instrumente.
 *
 * Diese drei nennt man im Kampf laut, und man nennt sie ständig. Sie stehen
 * deshalb im Profilkopf in eigenen Rahmen statt in einer Textzeile: eine
 * Form, die man aus zwei Metern findet, ohne zu lesen.
 *
 * Die AC bekommt als einzige eine eigene Silhouette. Ein Schild mit einer
 * Zahl darin braucht keine Beschriftung — und genau eine Sonderform ist
 * genug, sonst wird die Reihe zum Jahrmarkt.
 */
export function CombatStats({
  armorClass,
  initiative,
  speed,
}: {
  armorClass: number;
  /** Schon als "+2" formatiert. */
  initiative: string;
  speed: number;
}) {
  return (
    <dl className="flex shrink-0 gap-2">
      <Shield value={armorClass} />
      <Plate label="Initiative" value={initiative} icon={<BoltIcon />} />
      <Plate label="Speed" value={speed} unit="ft" icon={<StrideIcon />} />
    </dl>
  );
}

function Shield({ value }: { value: number }) {
  return (
    <div className="relative flex w-[4.5rem] shrink-0 flex-col items-center">
      <svg
        viewBox="0 0 44 50"
        aria-hidden
        className="h-[3.75rem] w-auto text-patina-dim"
      >
        <path
          d="M22 2 L41 8.5 V25 C41 37 32.5 44.5 22 48 C11.5 44.5 3 37 3 25 V8.5 Z"
          fill="var(--color-panel-2)"
          stroke="currentColor"
          strokeWidth="1.5"
        />
      </svg>

      {/* Über dem Schild statt darin, damit die Zahl nie an der schrägen
          Flanke klebt. -mt rückt sie in die breite obere Hälfte. */}
      <dd className="absolute top-[0.95rem] text-[1.375rem] leading-none font-semibold tabular-nums">
        {value}
      </dd>
      <dt className="label mt-1 text-[0.5625rem]">AC</dt>
    </div>
  );
}

function Plate({
  label,
  value,
  unit,
  icon,
}: {
  label: string;
  value: ReactNode;
  unit?: string;
  icon: ReactNode;
}) {
  return (
    <div className="flex w-[4.5rem] shrink-0 flex-col items-center">
      <div className="flex h-[3.75rem] w-full flex-col items-center justify-center gap-1 rounded-lg border border-edge bg-panel-2">
        <span className="text-faint">{icon}</span>
        <dd className="text-[1.375rem] leading-none font-semibold tabular-nums">
          {value}
          {unit ? (
            <span className="ml-0.5 text-[0.625rem] font-normal text-faint">
              {unit}
            </span>
          ) : null}
        </dd>
      </div>
      <dt className="label mt-1 text-[0.5625rem]">{label}</dt>
    </div>
  );
}

/* Icons als Inline-SVG: die App muss ohne Netz starten, also keine
   Icon-Schrift und kein Nachladen. */

function BoltIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="size-3.5">
      <path
        d="M13 2 L4 14 h6 l-1 8 9-12 h-6 z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * Pfeil mit zwei Schleiflinien. Ein Stiefel wäre naheliegender, aber auf
 * 14 Pixeln wird aus jeder Stiefelsilhouette ein Fleck — die Bewegungsspur
 * liest sich auch klein noch als "vorwärts".
 */
function StrideIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      className="size-3.5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <path d="M9 12 h11 M15 7 l5 5 -5 5" strokeLinejoin="round" />
      <path d="M2 8 h3 M2 16 h3" opacity="0.55" />
    </svg>
  );
}
