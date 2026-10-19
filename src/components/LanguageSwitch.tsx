"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { setModeAction } from "@/app/language-actions";
import { useT } from "@/lib/i18n/client";
import { MODE_NAMES, MODES } from "@/lib/i18n/modes";

import { cx } from "./ui";

/**
 * Die Sprachwahl: drei Knöpfe statt eines Auswahlfelds, weil es genau
 * drei sind und man sie nebeneinander vergleicht. Jeder Name steht in
 * seiner eigenen Sprache — wer kein Deutsch liest, findet "English" auch
 * in einer deutschen Oberfläche.
 */
export function LanguageSwitch() {
  const t = useT();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <div role="group" aria-label={t.language.label}>
      <p className="label">{t.language.label}</p>
      <div className="mt-2 grid grid-cols-3 gap-1.5">
        {MODES.map((mode) => (
          <button
            key={mode}
            type="button"
            aria-pressed={t.mode === mode}
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                await setModeAction(mode);
                router.refresh();
              })
            }
            className={cx(
              "min-h-11 rounded-md border px-2 py-1.5 text-xs leading-tight transition-colors",
              t.mode === mode
                ? "border-patina bg-patina-deep text-patina"
                : "border-edge-bright bg-panel-2 text-mute hover:text-fg",
            )}
          >
            {MODE_NAMES[mode]}
          </button>
        ))}
      </div>
      <p className="mt-1.5 text-xs text-faint">{t.language.hint}</p>
    </div>
  );
}
