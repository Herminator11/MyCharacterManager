"use client";

import Link from "next/link";
import { useRef, useState, useTransition } from "react";

import { Button, cx, Panel, SectionLabel } from "@/components/ui";
import type { ImportedCharacter } from "@/lib/import/types";
import { useT } from "@/lib/i18n/client";
import { renderImportWarning } from "@/lib/i18n/importWarnings";
import type { Messages } from "@/lib/i18n/messages";
import { className as classLabel } from "@/lib/rules/classes";
import { formatModifier } from "@/lib/rules/derive";
import { ABILITY_LABELS, SKILLS } from "@/lib/rules/skills";

import type { PlanResult, ReadResult } from "@/app/import/actions";
import type { SheetFormat } from "@/lib/import/types";
import type { ReimportPlan } from "@/lib/server/reimport";
import { ReimportPanel, type ImportTarget } from "./ReimportPanel";

const FORMAT_LABELS: Record<SheetFormat, (t: Messages) => string> = {
  official: (t) => t.import.formatOfficial,
  custom: (t) => t.import.formatCustom,
  aurora: (t) => t.import.formatAurora,
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
  const t = useT();
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
        <SectionLabel>{t.import.uploadTitle}</SectionLabel>
        <p className="text-sm text-mute">
          {t.import.introBefore}
          <strong>{t.import.introStrong}</strong>
          {t.import.introMiddle}
          <em>{t.import.introEm}</em>
          {t.import.introAfter}
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
            {reading ? t.import.reading : t.import.pick}
          </span>
          <span className="text-xs text-faint">
            {t.import.nothingSaved}
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
        {t.import.byHand}{" "}
        <Link href="/" className="text-patina underline-offset-4 hover:underline">
          {t.import.byHandLink}
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
  const t = useT();
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
              {FORMAT_LABELS[draft.format](t)}
            </span>
          }
        >
          {t.import.foundIn(fileName)}
        </SectionLabel>

        <h1 className="text-2xl font-semibold tracking-tight">{draft.name}</h1>
        <p className="mt-1 text-sm text-patina">
          {draft.classes.length > 0
            ? draft.classes
                .map((c) =>
                  `${c.known ? classLabel(c.classKey) : c.rawName} ${c.level}`,
                )
                .join(" / ")
            : t.header.noClass}
        </p>
        <p className="mt-0.5 text-xs text-faint">
          {[draft.race, draft.background, draft.alignment]
            .filter(Boolean)
            .join(" · ") || t.import.noDetails}
        </p>
      </Panel>

      {draft.warnings.length > 0 ? (
        <Panel className="border-brass/40 bg-brass/5">
          <SectionLabel>{t.import.pleaseCheck}</SectionLabel>
          <ul className="space-y-2">
            {draft.warnings.map((warning, index) => (
              <li key={index} className="flex gap-2 text-sm text-mute">
                <span aria-hidden className="text-brass">
                  •
                </span>
                <span>{renderImportWarning(t, warning)}</span>
              </li>
            ))}
          </ul>
        </Panel>
      ) : null}

      <div className="grid gap-3 lg:grid-cols-2 lg:items-start">
        <Panel>
          <SectionLabel>{t.import.abilities}</SectionLabel>
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
          <SectionLabel>{t.import.combatValues}</SectionLabel>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2.5 text-sm sm:grid-cols-3">
            <Value label={`${t.import.maxHp} ${t.term.hitPointsShort}`} value={draft.hpMaxOverride} />
            <Value label={t.import.current} value={draft.hpCurrent ?? t.import.full} />
            <Value label={t.import.temp} value={draft.hpTemp || "—"} />
            <Value label={t.term.armorClassShort} value={draft.acOverride} />
            <Value
              label={t.term.initiative}
              value={
                draft.initiativeOverride === null
                  ? null
                  : formatModifier(draft.initiativeOverride)
              }
            />
            <Value label={t.term.speed} value={draft.speed} />
            <Value label={t.term.passivePerception} value={draft.passivePerceptionOverride} />
            <Value label={t.term.spellSaveDc} value={draft.spellSaveDcOverride} />
            <Value
              label={t.term.spellAttackShort}
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
        <SectionLabel>{t.import.proficiencies}</SectionLabel>
        <p className="text-sm">
          <span className="label">{t.import.savingThrows}</span>
          <br />
          <span className="text-mute">
            {proficientSaves.length > 0 ? proficientSaves.join(", ") : t.import.none}
          </span>
        </p>
        <p className="mt-3 text-sm">
          <span className="label">{t.import.skills}</span>
          <br />
          <span className="text-mute">
            {proficientSkills.length > 0
              ? proficientSkills
                  .map(
                    (s) =>
                      `${s.name}${draft.skills[s.key] === 2 ? ` (${t.import.expertise})` : ""}`,
                  )
                  .join(", ")
              : t.import.none}
          </span>
        </p>
      </Panel>

      <div className="grid gap-3 lg:grid-cols-2 lg:items-start">
        <ListPanel
          title={t.import.spells}
          empty={t.import.noneFound}
          items={draft.spells.map(
            (s) => `${s.name} · ${s.level === 0 ? t.term.cantrip : t.term.spellLevel(s.level)}`,
          )}
        />
        <ListPanel
          title={t.import.attacks}
          empty={t.import.noneFound}
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
          title={t.import.equipment}
          empty={t.import.nothingFound}
          items={draft.items.map((i) => i.name)}
        />
        <ListPanel
          title={t.import.features}
          empty={t.import.noneFound}
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
        {t.import.otherFile}
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
  const t = useT();
  return (
    <div>
      <dt className="label">{label}</dt>
      <dd
        className={cx(
          "mt-0.5 text-base font-semibold tabular-nums",
          value === null && "font-normal text-faint",
        )}
      >
        {value ?? t.import.notInSheet}
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
