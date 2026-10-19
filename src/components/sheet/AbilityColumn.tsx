import { cx } from "@/components/ui";
import type { Ability } from "@/db/schema";
import { formatModifier } from "@/lib/rules/derive";
import { ABILITY_LABELS } from "@/lib/rules/skills";

export type AbilityEntry = {
  key: Ability;
  score: number;
  modifier: number;
  save: number;
  saveProficient: boolean;
  skills: {
    key: string;
    name: string;
    de: string;
    bonus: number;
    level: number;
  }[];
};

/**
 * Ein Attribut mit allem, was daran hängt — Rettungswurf und die
 * zugehörigen Fertigkeiten.
 *
 * Die Anordnung folgt dem gedruckten Charakterbogen: der Modifikator groß,
 * weil man den im Spiel benutzt, der Rohwert klein darunter, weil man ihn
 * fast nur beim Levelaufstieg braucht. Rechts daneben die Würfe, für die
 * dieses Attribut zählt.
 */
export function AbilityColumn({ ability }: { ability: AbilityEntry }) {
  const label = ABILITY_LABELS[ability.key];

  return (
    <div className="flex gap-3.5">
      {/* self-start, damit der Kasten seine natürliche Höhe behält — sonst
          zöge ihn eine lange Fertigkeitsliste wie bei INT in die Länge. */}
      <div className="flex w-[4.5rem] shrink-0 flex-col items-center self-start rounded-lg border border-edge bg-panel-2 px-2 py-2.5">
        <span className="label text-[0.625rem]">{label.name}</span>
        <span className="mt-1 text-[1.75rem] leading-none font-semibold tracking-tight tabular-nums">
          {formatModifier(ability.modifier)}
        </span>
        <span className="mt-1.5 rounded-full bg-ink px-2.5 py-0.5 text-xs text-mute tabular-nums">
          {ability.score}
        </span>
      </div>

      <ul className="min-w-0 flex-1 space-y-px self-start pt-1">
        <ProficiencyLine
          label="Rettungswurf"
          bonus={ability.save}
          level={ability.saveProficient ? 1 : 0}
          isSave
        />
        {ability.skills.map((skill) => (
          <ProficiencyLine
            key={skill.key}
            label={skill.name}
            hint={skill.de}
            bonus={skill.bonus}
            level={skill.level}
          />
        ))}
      </ul>
    </div>
  );
}

function ProficiencyLine({
  label,
  hint,
  bonus,
  level,
  isSave = false,
}: {
  label: string;
  hint?: string;
  bonus: number;
  level: number;
  isSave?: boolean;
}) {
  return (
    <li className="flex items-center gap-2 py-0.5">
      {/* Raute für Rettungswürfe, Kreis für Fertigkeiten — dieselbe
          Unterscheidung wie auf dem gedruckten Bogen. Expertise bekommt
          einen Ring statt einer zweiten Farbe. */}
      <span
        aria-hidden
        className={cx(
          "size-2.5 shrink-0 border transition-colors",
          isSave ? "rotate-45" : "rounded-full",
          level === 0 && "border-edge-bright bg-transparent",
          level === 1 && "border-patina bg-patina",
          level === 2 && "border-brass bg-brass ring-2 ring-brass/40",
        )}
      />
      <span
        className={cx(
          "w-9 shrink-0 text-right text-sm tabular-nums",
          level > 0 ? "font-semibold text-fg" : "text-mute",
        )}
      >
        {formatModifier(bonus)}
      </span>
      <span className="min-w-0 truncate text-sm text-mute">
        {label}
        {hint ? <span className="text-faint"> · {hint}</span> : null}
      </span>
    </li>
  );
}
