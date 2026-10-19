"use client";

import { useTransition } from "react";

import { Button, cx, inputClass } from "@/components/ui";
import { useT } from "@/lib/i18n/client";

export type SpeciesOption = {
  key: string;
  name: string;
  parentKey: string;
  custom: boolean;
};

/**
 * Auswahl der Spezies und der Knopf, der ihre Boni übernimmt.
 *
 * Beide zusammen, weil sie dieselbe Frage in zwei Schritten beantworten:
 * *was bin ich* und *steht das schon in meinen Werten*. Getrennt in zwei
 * Panels würde man den zweiten Schritt übersehen.
 *
 * Die Auswahl speichert beim Wechseln, ohne Bestätigen — sie ändert nur die
 * Verknüpfung, nicht den Charakter. Der Knopf darunter ändert Werte und
 * bleibt deshalb ein bewusster Griff.
 */
export function SpeciesPicker({
  options,
  current,
  applyHint,
  applied,
  importedFromPdf,
  onSelect,
  onApply,
  onRevert,
}: {
  options: SpeciesOption[];
  current: string;
  /**
   * Was das Übernehmen bewirken würde, fertig formuliert vom Server.
   * Leer, wenn nichts ausgewählt ist oder die Spezies keine Boni gibt.
   */
  applyHint: string;
  /** Steht schon in den Werten — dann gibt es nur noch das Zurücknehmen. */
  applied: boolean;
  /**
   * Der Bogen kam aus dem PDF-Import — die Boni stecken dann fast immer
   * schon in den Attributen, ohne dass `species_bonuses_from` das sagt.
   * Der direkte Knopf tritt deshalb zurück hinter eine bewusste
   * Zusatzbestätigung, statt ein zweites Addieren als Standardweg
   * anzubieten.
   */
  importedFromPdf: boolean;
  onSelect: (key: string) => Promise<void>;
  onApply: () => Promise<void>;
  onRevert: () => Promise<void>;
}) {
  const t = useT();
  const [pending, startTransition] = useTransition();

  const bases = options.filter((o) => !o.parentKey);

  return (
    <div className={cx("space-y-3", pending && "opacity-60")}>
      <select
        aria-label={t.species.title}
        value={current}
        disabled={pending}
        onChange={(event) =>
          startTransition(() => onSelect(event.target.value))
        }
        className={inputClass}
      >
        <option value="">{t.species.none}</option>
        {bases.map((base) => {
          const children = options.filter((o) => o.parentKey === base.key);

          // Ohne Subrassen bleibt es ein einzelner Eintrag — eine Gruppe
          // mit genau einem Kind wäre nur eine Einrückung ohne Aussage.
          if (children.length === 0) {
            return (
              <option key={base.key} value={base.key}>
                {base.name}
              </option>
            );
          }

          return (
            <optgroup key={base.key} label={base.name}>
              <option value={base.key}>{t.species.noSubrace(base.name)}</option>
              {children.map((child) => (
                <option key={child.key} value={child.key}>
                  {child.name}
                </option>
              ))}
            </optgroup>
          );
        })}
      </select>

      {/* Übernommen: nur noch der Rückweg. Der Knopf stehenzulassen hieße,
          ein zweites Addieren anzubieten — und das sähe man den Werten
          hinterher nicht mehr an. */}
      {applied ? (
        <div className="rounded-md border border-patina-dim bg-patina-deep/40 px-3 py-3">
          <p className="text-xs text-patina">
            {t.species.applied}
          </p>
          <Button
            variant="ghost"
            disabled={pending}
            onClick={() => startTransition(() => onRevert())}
            className="mt-1.5 w-full"
          >
            {pending ? t.species.reverting : t.species.revert}
          </Button>
        </div>
      ) : applyHint ? (
        <div className="rounded-md border border-edge bg-ink px-3 py-3">
          <p className="text-xs text-mute">{applyHint}</p>
          {importedFromPdf ? (
            // Kein Knopf als Standardweg: der Bogen kam aus dem Import, die
            // Boni stecken fast immer schon drin. Wer sie trotzdem
            // übernehmen will — etwa weil dieser eine Bogen sie tatsächlich
            // nicht eingerechnet hatte —, bekommt den Weg dorthin, nur nicht
            // als erstes, was ins Auge fällt.
            <>
              <p className="mt-2.5 text-xs text-brass">
                {t.species.fromPdf}
              </p>
              <button
                type="button"
                disabled={pending}
                onClick={() => startTransition(() => onApply())}
                className="mt-2 text-xs text-faint underline-offset-4 hover:text-patina hover:underline"
              >
                {pending ? t.species.applying : t.species.applyAnyway}
              </button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                disabled={pending}
                onClick={() => startTransition(() => onApply())}
                className="mt-2.5 w-full"
              >
                {pending ? t.species.applying : t.species.apply}
              </Button>
              <p className="mt-2 text-xs text-faint">
                {t.species.pdfHint}
              </p>
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}
