import type { ReactNode } from "react";

import { ShoeIcon } from "@/components/icons";

import { ArmorClassShield } from "./ArmorClassShield";

/**
 * Rüstungsklasse, Initiative und Bewegungsrate als Instrumente.
 *
 * Diese drei nennt man im Kampf laut, und man nennt sie ständig. Sie stehen
 * deshalb im Profilkopf in eigenen Rahmen statt in einer Textzeile: eine
 * Form, die man aus zwei Metern findet, ohne zu lesen.
 *
 * Die RK bekommt als einzige eine eigene Silhouette. Ein Schild mit einer
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
    // Am Handy drei gleich breite Spalten über die volle Breite, jedes
    // Instrument darin mittig — vorher standen die drei linksbündig und
    // ließen ein Drittel leer. Ab lg wieder die kompakte Reihe rechts.
    <dl className="grid grid-cols-3 justify-items-center gap-2 lg:flex lg:shrink-0">
      <ArmorClassShield value={armorClass} />
      <Plate label="Initiative" value={initiative} icon={<BoltIcon />} />
      <Plate label="Bewegung" value={speed} unit="ft" icon={<ShoeIcon />} />
    </dl>
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
        <dd className="font-numeral text-[1.375rem] leading-none font-semibold tabular-nums">
          {value}
          {unit ? (
            <span className="ml-0.5 text-[0.625rem] font-normal text-faint">
              {unit}
            </span>
          ) : null}
        </dd>
      </div>
      <dt className="label mt-1 text-[0.625rem]">{label}</dt>
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
