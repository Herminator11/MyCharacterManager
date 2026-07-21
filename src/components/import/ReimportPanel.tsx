"use client";

import { useEffect, useState, useTransition } from "react";

import { Button, cx, Panel, SectionLabel } from "@/components/ui";
import type { PlanResult } from "@/app/import/actions";
import type { ReimportPlan } from "@/lib/server/reimport";

export type ImportTarget = { id: number; name: string; summary: string };

/**
 * Der Zielschritt: neuer Charakter oder bestehenden aktualisieren.
 *
 * Beim Aktualisieren zeigt die App vorher genau, was sich ändert und was
 * bleibt. Das ist der Kern der Sache — ein Levelaufstieg darf niemals die
 * Beute vom letzten Spielabend oder die verbrauchten Zauberplätze
 * wegräumen, und man soll sich darauf verlassen können, ohne es zu hoffen.
 */
export function ReimportPanel({
  targets,
  draftName,
  draftJson,
  plan,
  onPlan,
  onCommitNew,
  onCommitUpdate,
  busy,
}: {
  targets: ImportTarget[];
  draftName: string;
  draftJson: string;
  plan: ReimportPlan | null;
  onPlan: (characterId: number) => void;
  onCommitNew: () => void;
  onCommitUpdate: (characterId: number) => void;
  busy: boolean;
}) {
  const [selected, setSelected] = useState<number | "new">("new");
  const [, startTransition] = useTransition();

  // Beim Wechsel auf einen bestehenden Charakter sofort die Vorschau holen.
  useEffect(() => {
    if (selected !== "new") startTransition(() => onPlan(selected));
    // onPlan ist stabil, draftJson identifiziert den Entwurf.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, draftJson]);

  if (targets.length === 0) {
    return (
      <Panel>
        <Button
          variant="solid"
          size="lg"
          className="w-full"
          onClick={onCommitNew}
          disabled={busy}
        >
          {busy ? "Wird angelegt…" : `${draftName} anlegen`}
        </Button>
      </Panel>
    );
  }

  return (
    <Panel>
      <SectionLabel>Wohin soll der Bogen?</SectionLabel>

      <div className="space-y-2">
        <Choice
          active={selected === "new"}
          onClick={() => setSelected("new")}
          title={`Als neuen Charakter anlegen`}
          hint={`„${draftName}“ kommt zusätzlich in die Liste.`}
        />
        {targets.map((target) => (
          <Choice
            key={target.id}
            active={selected === target.id}
            onClick={() => setSelected(target.id)}
            title={`${target.name} aktualisieren`}
            hint={target.summary}
          />
        ))}
      </div>

      {selected !== "new" ? (
        <div className="mt-4">
          {plan ? <Diff plan={plan} /> : (
            <p className="text-sm text-faint">Vergleich wird berechnet…</p>
          )}
        </div>
      ) : null}

      <Button
        variant="solid"
        size="lg"
        className="mt-4 w-full"
        disabled={busy || (selected !== "new" && !plan)}
        onClick={() =>
          selected === "new" ? onCommitNew() : onCommitUpdate(selected)
        }
      >
        {busy
          ? "Wird übernommen…"
          : selected === "new"
            ? `${draftName} anlegen`
            : `${plan?.characterName ?? "Charakter"} aktualisieren`}
      </Button>
    </Panel>
  );
}

function Choice({
  active,
  onClick,
  title,
  hint,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  hint: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cx(
        "flex w-full items-start gap-3 rounded-md border px-3 py-3 text-left transition-colors",
        active
          ? "border-patina bg-patina-deep"
          : "border-edge bg-panel-2 hover:border-edge-bright",
      )}
    >
      <span
        aria-hidden
        className={cx(
          "mt-0.5 size-3 shrink-0 rounded-full border",
          active ? "border-patina bg-patina" : "border-edge-bright",
        )}
      />
      <span className="min-w-0">
        <span className="block text-sm font-medium">{title}</span>
        <span className="block truncate text-xs text-faint">{hint}</span>
      </span>
    </button>
  );
}

function Diff({ plan }: { plan: ReimportPlan }) {
  const changed = plan.changes.filter((c) => c.changed);

  return (
    <div className="space-y-3 rounded-md border border-edge bg-ink px-3.5 py-3">
      {changed.length === 0 ? (
        <p className="text-sm text-mute">
          Der Bogen entspricht dem, was schon gespeichert ist — es ändert sich
          nichts.
        </p>
      ) : (
        <div>
          <p className="label mb-2">Wird ersetzt</p>
          <ul className="space-y-1">
            {changed.map((line) => (
              <li key={line.label} className="flex gap-2 text-sm">
                <span className="w-28 shrink-0 truncate text-faint">
                  {line.label}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="text-mute line-through">{line.before}</span>
                  <span className="mx-1.5 text-faint">→</span>
                  <span className="font-semibold text-patina">{line.after}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {plan.newSpells.length > 0 ? (
        <p className="text-sm">
          <span className="label">Neue Zauber</span>
          <br />
          <span className="text-patina">{plan.newSpells.join(", ")}</span>
        </p>
      ) : null}

      {plan.removedSpells.length > 0 ? (
        <p className="text-sm">
          <span className="label">Nicht mehr im Bogen</span>
          <br />
          <span className="text-mute">{plan.removedSpells.join(", ")}</span>
          <span className="mt-0.5 block text-xs text-faint">
            Bleiben erhalten — entfernen kannst du sie in der Zauberliste.
          </span>
        </p>
      ) : null}

      <div>
        <p className="label mb-1.5">Bleibt unangetastet</p>
        <p className="text-xs leading-relaxed text-mute">
          {plan.preserved.join(" · ")}
        </p>
      </div>
    </div>
  );
}

export type { PlanResult };
