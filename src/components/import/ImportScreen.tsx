"use client";

import Link from "next/link";
import { useRef, useState, useTransition } from "react";

import { Button, cx, Panel, SectionLabel } from "@/components/ui";
import type { ImportedCharacter } from "@/lib/import/types";
import { className as classLabel } from "@/lib/rules/classes";
import { formatModifier } from "@/lib/rules/derive";
import { ABILITY_LABELS, SKILLS } from "@/lib/rules/skills";

import type { PlanResult, ReadResult } from "@/app/import/actions";
import type { SheetFormat } from "@/lib/import/types";
import type { ReimportPlan } from "@/lib/server/reimport";
import { ReimportPanel, type ImportTarget } from "./ReimportPanel";

const FORMAT_LABELS: Record<SheetFormat, string> = {
  official: "Offizieller Bogen",
  custom: "Erweitertes Format",
  aurora: "Aurora-Bogen",
};

/**
 * Import in zwei Schritten: erst lesen, dann bestätigen.
 *
 * Der Zwischenschritt ist der eigentliche Kern. Die Extraktion aus einem
 * PDF kann immer danebengreifen — ein Feld leer, eine Klasse anders
 * geschrieben. Deshalb legt der Import nichts an, bevor nicht jeder Wert
 * einmal vor Augen stand.
 */
export function ImportScreen({
  read,
  commit,
  targets,
  plan,
  commitUpdate,
}: {
  read: (formData: FormData) => Promise<ReadResult>;
  commit: (draftJson: string) => Promise<void>;
  /** Bestehende Charaktere, die der Bogen aktualisieren könnte. */
  targets: ImportTarget[];
  plan: (characterId: number, draftJson: string) => Promise<PlanResult>;
  commitUpdate: (characterId: number, draftJson: string) => Promise<void>;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState<ImportedCharacter | null>(null);
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [reading, startReading] = useTransition();
  const [committing, startCommitting] = useTransition();
  const [reimportPlan, setReimportPlan] = useState<ReimportPlan | null>(null);

  const pick = (file: File) => {
    const formData = new FormData();
    formData.set("sheet", file);
    setError(null);
    setFileName(file.name);

    startReading(async () => {
      const result = await read(formData);
      if (result.ok) setDraft(result.draft);
      else {
        setDraft(null);
        setError(result.error);
      }
    });
  };

  if (draft) {
    return (
      <Review
        draft={draft}
        fileName={fileName}
        busy={committing}
        onDiscard={() => {
          setDraft(null);
          setFileName("");
          setReimportPlan(null);
        }}
        target={
          <ReimportPanel
            targets={targets}
            draftName={draft.name}
            draftJson={JSON.stringify(draft)}
            plan={reimportPlan}
            busy={committing}
            onPlan={async (characterId) => {
              setReimportPlan(null);
              const result = await plan(characterId, JSON.stringify(draft));
              if (result.ok) setReimportPlan(result.plan);
            }}
            onCommitNew={() =>
              startCommitting(() => commit(JSON.stringify(draft)))
            }
            onCommitUpdate={(characterId) =>
              startCommitting(() =>
                commitUpdate(characterId, JSON.stringify(draft)),
              )
            }
          />
        }
      />
    );
  }

  return (
    <div className="space-y-3">
      <Panel>
        <SectionLabel>Charakterbogen hochladen</SectionLabel>
        <p className="text-sm text-mute">
          Der Import liest den <strong>offiziellen D&amp;D-Charakterbogen</strong>{" "}
          von Wizards of the Coast — den Bogen, den auch Aurora ausgibt.
          Wichtig ist nur, dass es die <em>ausfüllbare</em> Fassung ist: ein
          Scan oder Ausdruck enthält keine Daten zum Auslesen.
        </p>

        <button
          type="button"
          disabled={reading}
          onClick={() => input.current?.click()}
          className={cx(
            "mt-4 flex w-full flex-col items-center gap-2 rounded-lg border border-dashed border-edge-bright px-5 py-10 transition-colors",
            reading ? "opacity-50" : "hover:border-patina hover:bg-panel-2",
          )}
        >
          <span className="text-base font-semibold">
            {reading ? "Wird gelesen…" : "PDF auswählen"}
          </span>
          <span className="text-xs text-faint">
            Nichts wird gespeichert, bevor du es bestätigst.
          </span>
        </button>

        <input
          ref={input}
          type="file"
          accept="application/pdf,.pdf"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) pick(file);
            event.target.value = "";
          }}
        />

        {error ? (
          <p className="mt-3 rounded-md border border-ember-dim bg-ember-deep/40 px-3 py-2.5 text-sm text-ember">
            {error}
          </p>
        ) : null}
      </Panel>

      <p className="text-center text-xs text-faint">
        Lieber von Hand?{" "}
        <Link href="/" className="text-patina underline-offset-4 hover:underline">
          Charakter selbst anlegen
        </Link>
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Bestätigungsansicht
 * ------------------------------------------------------------------ */

function Review({
  draft,
  fileName,
  busy,
  onDiscard,
  target,
}: {
  draft: ImportedCharacter;
  fileName: string;
  busy: boolean;
  onDiscard: () => void;
  /** Zielauswahl: neuer Charakter oder bestehenden aktualisieren. */
  target: React.ReactNode;
}) {
  const proficientSkills = SKILLS.filter((s) => (draft.skills[s.key] ?? 0) > 0);
  const proficientSaves = Object.entries(draft.saves)
    .filter(([, level]) => level > 0)
    .map(([ability]) => ABILITY_LABELS[ability as keyof typeof ABILITY_LABELS].name);

  return (
    <div className="space-y-3">
      <Panel>
        <SectionLabel
          right={
            <span className="text-[0.6875rem] text-faint">
              {FORMAT_LABELS[draft.format]}
            </span>
          }
        >
          Gefunden in {fileName}
        </SectionLabel>

        <h1 className="text-2xl font-semibold tracking-tight">{draft.name}</h1>
        <p className="mt-1 text-sm text-patina">
          {draft.classes.length > 0
            ? draft.classes
                .map((c) =>
                  `${c.known ? classLabel(c.classKey) : c.rawName} ${c.level}`,
                )
                .join(" / ")
            : "Ohne Klasse"}
        </p>
        <p className="mt-0.5 text-xs text-faint">
          {[draft.race, draft.background, draft.alignment]
            .filter(Boolean)
            .join(" · ") || "Keine weiteren Angaben"}
        </p>
      </Panel>

      {draft.warnings.length > 0 ? (
        <Panel className="border-brass/40 bg-brass/5">
          <SectionLabel>Bitte einmal ansehen</SectionLabel>
          <ul className="space-y-2">
            {draft.warnings.map((warning, index) => (
              <li key={index} className="flex gap-2 text-sm text-mute">
                <span aria-hidden className="text-brass">
                  •
                </span>
                <span>{warning}</span>
              </li>
            ))}
          </ul>
        </Panel>
      ) : null}

      <div className="grid gap-3 lg:grid-cols-2 lg:items-start">
        <Panel>
          <SectionLabel>Attribute</SectionLabel>
          <div className="grid grid-cols-3 gap-2.5">
            {(
              Object.entries(draft.scores) as [
                keyof typeof ABILITY_LABELS,
                number,
              ][]
            ).map(([ability, score]) => (
              <div
                key={ability}
                className="rounded-md border border-edge bg-panel-2 px-2 py-2 text-center"
              >
                <p className="label text-[0.625rem]">
                  {ABILITY_LABELS[ability].name}
                </p>
                <p className="mt-1 text-xl leading-none font-semibold tabular-nums">
                  {score}
                </p>
                <p className="mt-1 text-xs text-patina">
                  {formatModifier(Math.floor((score - 10) / 2))}
                </p>
              </div>
            ))}
          </div>
        </Panel>

        <Panel>
          <SectionLabel>Kampfwerte</SectionLabel>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2.5 text-sm sm:grid-cols-3">
            <Value label="Max. TP" value={draft.hpMaxOverride} />
            <Value label="Aktuell" value={draft.hpCurrent ?? "voll"} />
            <Value label="Temp" value={draft.hpTemp || "—"} />
            <Value label="RK" value={draft.acOverride} />
            <Value
              label="Initiative"
              value={
                draft.initiativeOverride === null
                  ? null
                  : formatModifier(draft.initiativeOverride)
              }
            />
            <Value label="Bewegung" value={draft.speed} />
            <Value label="Wahrn. (passiv)" value={draft.passivePerceptionOverride} />
            <Value label="Zauber-SG" value={draft.spellSaveDcOverride} />
            <Value
              label="Zauberangriff"
              value={
                draft.spellAttackOverride === null
                  ? null
                  : formatModifier(draft.spellAttackOverride)
              }
            />
          </dl>
        </Panel>
      </div>

      <Panel>
        <SectionLabel>Übungen</SectionLabel>
        <p className="text-sm">
          <span className="label">Rettungswürfe</span>
          <br />
          <span className="text-mute">
            {proficientSaves.length > 0 ? proficientSaves.join(", ") : "keine"}
          </span>
        </p>
        <p className="mt-3 text-sm">
          <span className="label">Fertigkeiten</span>
          <br />
          <span className="text-mute">
            {proficientSkills.length > 0
              ? proficientSkills
                  .map(
                    (s) =>
                      `${s.name}${draft.skills[s.key] === 2 ? " (Expertise)" : ""}`,
                  )
                  .join(", ")
              : "keine"}
          </span>
        </p>
      </Panel>

      <div className="grid gap-3 lg:grid-cols-2 lg:items-start">
        <ListPanel
          title="Zauber"
          empty="Keine im Bogen gefunden."
          items={draft.spells.map(
            (s) => `${s.name} · ${s.level === 0 ? "Cantrip" : `Grad ${s.level}`}`,
          )}
        />
        <ListPanel
          title="Angriffe"
          empty="Keine im Bogen gefunden."
          items={draft.attacks.map((a) =>
            [
              a.name,
              a.attackBonus === null ? "" : formatModifier(a.attackBonus),
              a.damage,
            ]
              .filter(Boolean)
              .join(" · "),
          )}
        />
        <ListPanel
          title="Ausrüstung"
          empty="Nichts im Bogen gefunden."
          items={draft.items.map((i) => i.name)}
        />
        <ListPanel
          title="Fähigkeiten"
          empty="Keine im Bogen gefunden."
          items={draft.features.map((f) => f.name)}
        />
      </div>

      {target}

      <button
        type="button"
        onClick={onDiscard}
        disabled={busy}
        className="w-full py-2 text-sm text-faint underline-offset-4 hover:text-mute hover:underline disabled:opacity-40"
      >
        Andere Datei wählen
      </button>
    </div>
  );
}

function Value({
  label,
  value,
}: {
  label: string;
  value: string | number | null;
}) {
  return (
    <div>
      <dt className="label">{label}</dt>
      <dd
        className={cx(
          "mt-0.5 text-base font-semibold tabular-nums",
          value === null && "font-normal text-faint",
        )}
      >
        {value ?? "nicht im Bogen"}
      </dd>
    </div>
  );
}

function ListPanel({
  title,
  items,
  empty,
}: {
  title: string;
  items: string[];
  empty: string;
}) {
  return (
    <Panel>
      <SectionLabel
        right={
          items.length > 0 ? (
            <span className="text-[0.6875rem] text-faint">{items.length}</span>
          ) : null
        }
      >
        {title}
      </SectionLabel>
      {items.length === 0 ? (
        <p className="text-sm text-faint">{empty}</p>
      ) : (
        <ul className="space-y-1 text-sm text-mute">
          {items.map((item, index) => (
            <li key={index} className="truncate">
              {item}
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
