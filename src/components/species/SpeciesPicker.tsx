"use client";

import { useTransition } from "react";

import { Button, cx, inputClass } from "@/components/ui";

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
  onSelect: (key: string) => Promise<void>;
  onApply: () => Promise<void>;
  onRevert: () => Promise<void>;
}) {
  const [pending, startTransition] = useTransition();

  const bases = options.filter((o) => !o.parentKey);

  return (
    <div className={cx("space-y-3", pending && "opacity-60")}>
      <select
        aria-label="Spezies"
        value={current}
        disabled={pending}
        onChange={(event) =>
          startTransition(() => onSelect(event.target.value))
        }
        className={inputClass}
      >
        <option value="">Keine Angabe</option>
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
              <option value={base.key}>{base.name} (ohne Subrasse)</option>
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
            Die Boni stecken in den Attributen.
          </p>
          <Button
            variant="ghost"
            disabled={pending}
            onClick={() => startTransition(() => onRevert())}
            className="mt-1.5 w-full"
          >
            {pending ? "Nimmt zurück…" : "Rückgängig"}
          </Button>
        </div>
      ) : applyHint ? (
        <div className="rounded-md border border-edge bg-ink px-3 py-3">
          <p className="text-xs text-mute">{applyHint}</p>
          <Button
            variant="outline"
            disabled={pending}
            onClick={() => startTransition(() => onApply())}
            className="mt-2.5 w-full"
          >
            {pending ? "Übernimmt…" : "Boni übernehmen"}
          </Button>
          <p className="mt-2 text-xs text-faint">
            Aus einem PDF importierte Bögen haben die Boni fast immer schon
            eingerechnet — dann ist hier nichts zu tun.
          </p>
        </div>
      ) : null}
    </div>
  );
}
