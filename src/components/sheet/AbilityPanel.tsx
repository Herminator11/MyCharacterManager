"use client";

import { useState, useTransition } from "react";

import { AbilityColumn, type AbilityEntry } from "@/components/sheet/AbilityColumn";
import { Button, EditToggle, Panel, SectionLabel } from "@/components/ui";
import { abilityModifier, formatModifier } from "@/lib/rules/derive";
import { ABILITY_LABELS } from "@/lib/rules/skills";

/**
 * Die Attribute — im Normalfall zum Ablesen, auf Knopfdruck zum Ändern.
 *
 * Ein Levelaufstieg ändert oft nur einen einzigen Wert: +2 auf CHA aus einer
 * Attributsverbesserung. Dafür in Aurora einen neuen Bogen zu erzeugen und
 * hochzuladen wäre absurd — also geht es hier direkt, an der Stelle, an der
 * man die Zahl ohnehin gerade anschaut.
 *
 * Rettungswürfe und Fertigkeiten bleiben im Bogen: die ändern sich bei einem
 * Aufstieg selten, und sie hier unterzubringen würde den Kampfblick
 * zumüllen.
 */
export function AbilityPanel({
  abilities,
  save,
}: {
  abilities: AbilityEntry[];
  save: (scores: Record<string, number>) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);

  return (
    <Panel>
      <SectionLabel
        right={
          // Hieß einmal "Werte ändern". Dasselbe Versprechen wie auf der
          // Startseite verdient dasselbe Wort — und denselben Stift.
          editing ? null : (
            <EditToggle editing={false} onClick={() => setEditing(true)} />
          )
        }
      >
        Attribute
      </SectionLabel>

      {editing ? (
        <ScoreEditor
          abilities={abilities}
          save={save}
          onDone={() => setEditing(false)}
        />
      ) : (
        // Reihenfolge bleibt STR–DEX–CON–INT–WIS–CHA wie auf jedem
        // gedruckten Bogen. CON hat keine Fertigkeiten und wird dadurch
        // von selbst zur kürzesten Zeile.
        <div className="space-y-4">
          {abilities.map((ability) => (
            <AbilityColumn key={ability.key} ability={ability} />
          ))}
        </div>
      )}
    </Panel>
  );
}

function ScoreEditor({
  abilities,
  save,
  onDone,
}: {
  abilities: AbilityEntry[];
  save: (scores: Record<string, number>) => Promise<void>;
  onDone: () => void;
}) {
  const [draft, setDraft] = useState<Record<string, string>>(() =>
    Object.fromEntries(abilities.map((a) => [a.key, String(a.score)])),
  );
  const [pending, startTransition] = useTransition();

  const commit = () => {
    const scores = Object.fromEntries(
      abilities.map((a) => {
        const value = Number(draft[a.key]);
        // Unlesbares oder leeres Feld heißt "unverändert", nicht "0".
        return [a.key, Number.isFinite(value) && value > 0 ? value : a.score];
      }),
    );

    startTransition(async () => {
      await save(scores);
      onDone();
    });
  };

  return (
    <div>
      <div className="grid grid-cols-3 gap-2.5">
        {abilities.map((ability) => {
          const value = Number(draft[ability.key]);
          const modifier = Number.isFinite(value)
            ? abilityModifier(value)
            : ability.modifier;
          const changed = value !== ability.score;

          return (
            <label key={ability.key} className="block">
              <span className="label">{ABILITY_LABELS[ability.key].name}</span>
              <input
                type="number"
                inputMode="numeric"
                min={1}
                max={30}
                value={draft[ability.key]}
                onChange={(event) =>
                  setDraft({ ...draft, [ability.key]: event.target.value })
                }
                onKeyDown={(event) => {
                  if (event.key === "Enter") commit();
                  if (event.key === "Escape") onDone();
                }}
                className="mt-1 min-h-12 w-full rounded-md border border-edge bg-ink px-2 text-center text-lg font-semibold tabular-nums focus:border-patina focus:outline-none"
              />
              {/* Der Modifikator rechnet beim Tippen mit — man sieht sofort,
                  ob die zwei Punkte überhaupt eine Stufe bringen. */}
              <span
                className={`mt-1 block text-center text-xs tabular-nums ${
                  changed ? "text-patina" : "text-faint"
                }`}
              >
                {formatModifier(modifier)}
              </span>
            </label>
          );
        })}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <Button onClick={onDone} disabled={pending}>
          Abbrechen
        </Button>
        <Button variant="solid" onClick={commit} disabled={pending}>
          {pending ? "Speichert…" : "Speichern"}
        </Button>
      </div>

      <p className="mt-2 text-xs text-faint">
        Rettungswürfe, Fertigkeiten, Zauber-DC und die maximalen Trefferpunkte
        rechnen sich neu, sobald du speicherst.
      </p>
    </div>
  );
}
