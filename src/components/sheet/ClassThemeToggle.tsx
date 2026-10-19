"use client";

import { useTransition } from "react";

import { cx } from "@/components/ui";
import { SwitchIcon } from "@/components/icons";
import { useT } from "@/lib/i18n/client";

/**
 * Ein-/Ausschalter für den Klassenhintergrund. Rein kosmetisch, deshalb
 * neben der Klassenliste statt in einer eigenen "Einstellungen"-Sektion,
 * die es sonst nirgends in der App gibt.
 */
export function ClassThemeToggle({
  enabled,
  onChange,
}: {
  enabled: boolean;
  onChange: (enabled: boolean) => Promise<void>;
}) {
  const t = useT();
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      aria-pressed={enabled}
      onClick={() => startTransition(() => onChange(!enabled))}
      className={cx(
        "inline-flex min-h-11 items-center gap-2 rounded-md px-2 text-xs transition-colors",
        enabled ? "text-patina" : "text-faint hover:text-mute",
        pending && "opacity-60",
      )}
    >
      <SwitchIcon on={enabled} />
      {t.sheet.classTheme}
    </button>
  );
}
