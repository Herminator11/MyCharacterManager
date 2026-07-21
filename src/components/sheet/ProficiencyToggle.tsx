"use client";

import { useTransition } from "react";

import { cx } from "@/components/ui";
import { formatModifier } from "@/lib/rules/derive";

/**
 * Eine Zeile für einen Rettungswurf oder eine Fertigkeit.
 *
 * Antippen schaltet durch keine → proficient → Expertise → keine. Ein
 * Dropdown mit drei Optionen wäre für den seltenen Expertise-Fall zu viel
 * Aufwand bei jedem der 24 Einträge.
 */
export function ProficiencyToggle({
  label,
  sublabel,
  bonus,
  level,
  onChange,
}: {
  label: string;
  sublabel?: string;
  bonus: number;
  level: number;
  onChange: (level: number) => Promise<void> | void;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => startTransition(() => Promise.resolve(onChange((level + 1) % 3)))}
      className={cx(
        "flex w-full min-h-11 items-center gap-3 rounded-md px-2 text-left transition-colors hover:bg-panel-2",
        pending && "opacity-60",
      )}
    >
      <span
        aria-hidden
        className={cx(
          "size-3 shrink-0 rounded-full border transition-colors",
          level === 0 && "border-edge-bright bg-transparent",
          level === 1 && "border-patina bg-patina",
          // Expertise: Ring statt Vollfläche — zwei Zustände, zwei Formen.
          level === 2 && "border-brass bg-brass ring-2 ring-brass/40",
        )}
      />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm">{label}</span>
        {sublabel ? (
          <span className="block truncate text-xs text-faint">{sublabel}</span>
        ) : null}
      </span>
      <span
        className={cx(
          "shrink-0 text-sm tabular-nums",
          level > 0 ? "font-semibold text-fg" : "text-mute",
        )}
      >
        {formatModifier(bonus)}
      </span>
    </button>
  );
}
