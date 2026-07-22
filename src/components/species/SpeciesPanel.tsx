import { CustomSpeciesForm } from "@/components/species/CustomSpeciesForm";
import {
  SpeciesPicker,
  type SpeciesOption,
} from "@/components/species/SpeciesPicker";
import { Panel, SectionLabel } from "@/components/ui";
import { formatModifier } from "@/lib/rules/derive";
import { ABILITY_LABELS } from "@/lib/rules/skills";
import {
  bonusEntries,
  bonusSummary,
  modifierChanges,
  withoutSpeciesBonuses,
  type SpeciesDef,
} from "@/lib/rules/species";
import type { AbilityScores } from "@/lib/rules/derive";

/**
 * Was die Spezies mitbringt — und ob es schon in den Werten steht.
 *
 * Die Boni stehen hier als Angabe, nicht als Rechnung: die gespeicherten
 * Attribute sind immer Endwerte. Der Hinweis am Knopf sagt deshalb voraus,
 * was das Übernehmen *ändern würde*, und zwar in Modifikatoren — dass CHA
 * von 15 auf 17 steigt, ist am Tisch folgenlos, solange +2 stehen bleibt.
 */
export function SpeciesPanel({
  id,
  options,
  current,
  scores,
  fallbackName,
  suggestion,
  applied,
  appliedFrom,
  onSelect,
  onApply,
  onRevert,
  onCreate,
}: {
  id: string;
  options: SpeciesOption[];
  current: SpeciesDef | null;
  scores: AbilityScores;
  /** Der rohe Text vom importierten Bogen, falls nichts verknüpft ist. */
  fallbackName: string;
  /**
   * Die Spezies, die zu `fallbackName` passen würde. Bewusst nur ein
   * Vorschlag: sie beim Anzeigen zu verknüpfen wäre ein Seiteneffekt beim
   * Seitenaufruf, und die haben sich hier schon einmal gerächt.
   */
  suggestion: string;
  /** Die Boni dieser Spezies stecken bereits in den Attributen. */
  applied: boolean;
  /**
   * Die Spezies, deren Boni gerade in den Werten stecken — falls es eine
   * *andere* als die gewählte ist. Beim Übernehmen wird sie zuerst wieder
   * abgezogen, und das gehört in den Hinweis: sonst wundert man sich, warum
   * neben CON auch CHA gesprungen ist.
   */
  appliedFrom: SpeciesDef | null;
  onSelect: (key: string) => Promise<void>;
  onApply: () => Promise<void>;
  onRevert: () => Promise<void>;
  onCreate: (formData: FormData) => Promise<void>;
}) {
  const bonuses = current ? bonusEntries(current) : [];

  return (
    <Panel id={id} className="scroll-mt-24">
      <SectionLabel
        right={
          current ? (
            <span className="text-xs text-mute">
              {current.size} · {current.speed} ft
            </span>
          ) : null
        }
      >
        Spezies
      </SectionLabel>

      <SpeciesPicker
        options={options}
        current={current?.key ?? ""}
        applyHint={applyHint(current, scores, appliedFrom)}
        applied={applied}
        onSelect={onSelect}
        onApply={onApply}
        onRevert={onRevert}
      />

      {current ? (
        <div className="mt-4 space-y-3">
          {bonuses.length > 0 ? (
            <dl className="flex flex-wrap gap-x-4 gap-y-2">
              {bonuses.map(({ ability, bonus }) => (
                <div key={ability}>
                  <dd className="text-lg leading-none font-semibold tabular-nums text-patina">
                    {formatModifier(bonus)}
                  </dd>
                  <dt className="label mt-1 text-[0.5625rem]">
                    {ABILITY_LABELS[ability].name}
                  </dt>
                </div>
              ))}
            </dl>
          ) : null}

          {current.choiceNote ? (
            <p className="text-xs text-brass">{current.choiceNote}</p>
          ) : null}

          {current.traits.length > 0 ? (
            <ul className="divide-y divide-edge border-t border-edge">
              {current.traits.map((trait) => (
                <li key={trait.name} className="py-2.5">
                  <p className="text-sm font-medium">{trait.name}</p>
                  {trait.description ? (
                    <p className="mt-1 text-xs leading-relaxed text-mute">
                      {trait.description}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : fallbackName ? (
        // Der Text vom Bogen bleibt stehen — verloren geht nichts. Ob der
        // Katalog ihn kennt, entscheidet nur, welchen Rat wir geben.
        <p className="mt-3 text-xs text-faint">
          Auf dem Bogen steht „{fallbackName}".{" "}
          {suggestion ? (
            <>
              Das ist{" "}
              <span className="text-patina">{suggestion}</span> im Katalog —
              oben auswählen, dann stehen Boni und Traits hier.
            </>
          ) : (
            <>
              Diese Spezies kennt der Katalog nicht — wähle eine andere aus
              oder lege sie unten selbst an.
            </>
          )}
        </p>
      ) : null}

      <CustomSpeciesForm action={onCreate} />
    </Panel>
  );
}

/** Der Satz über dem Übernehmen-Knopf. Leer heißt: kein Knopf. */
function applyHint(
  def: SpeciesDef | null,
  scores: AbilityScores,
  appliedFrom: SpeciesDef | null,
): string {
  if (!def) return "";

  const bonuses = bonusEntries(def);
  if (bonuses.length === 0) return "";

  const list = bonuses
    .map(
      ({ ability, bonus }) =>
        `${formatModifier(bonus)} ${ABILITY_LABELS[ability].name}`,
    )
    .join(", ");

  // Was noch von der vorherigen Spezies in den Werten steckt, wird zuerst
  // abgezogen. Ungesagt wäre das eine böse Überraschung.
  const swap =
    appliedFrom && appliedFrom.key !== def.key
      ? `Nimmt zuerst die Boni von ${appliedFrom.name} zurück (${bonusSummary(appliedFrom)}). `
      : "";

  // Der Rest der Vorhersage rechnet auf dem Zustand *nach* dem Zurücknehmen
  // — sonst stünde dort, was ohne den Tausch passieren würde.
  const base = appliedFrom && appliedFrom.key !== def.key
    ? withoutSpeciesBonuses(scores, appliedFrom)
    : scores;

  const changes = modifierChanges(base, def);

  // Der Unterschied, der am Tisch zählt: welche Modifikatoren springen. Bei
  // geraden Werten kann ein +1 folgenlos verpuffen — das gehört dazugesagt,
  // sonst drückt man und hält das Ergebnis für einen Fehler.
  const effect =
    changes.length === 0
      ? "Kein Modifikator ändert sich dadurch."
      : changes
          .map(
            ({ ability, from, to }) =>
              `${ABILITY_LABELS[ability].name} ${formatModifier(from)} → ${formatModifier(to)}`,
          )
          .join(", ");

  return `${swap}Addiert ${list} auf die Attribute und setzt die Bewegungsrate auf ${def.speed} ft. ${effect}`;
}
