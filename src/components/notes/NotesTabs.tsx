"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cx } from "@/components/ui";

const TABS = [
  { segment: "", label: "Seiten" },
  { segment: "log", label: "Kampagnen-Log" },
] as const;

/** Zwei sehr verschiedene Dinge unter „Notizen“: ausformulierte Seiten und
 *  der Vorgeschichte-Text hier, das schnelle Mitschreiben drüben — beide
 *  wachsen, aber niemand liest sie auf dieselbe Art. */
export function NotesTabs({ base }: { base: string }) {
  const pathname = usePathname();

  return (
    <nav aria-label="Notizen" className="flex gap-1.5">
      {TABS.map((tab) => {
        const href = tab.segment ? `${base}/${tab.segment}` : base;
        const active = pathname === href;

        return (
          <Link
            key={tab.segment}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cx(
              "rounded-md border px-3 py-1.5 text-xs font-medium transition-colors",
              active
                ? "border-patina text-patina"
                : "border-edge bg-panel text-mute hover:border-patina hover:text-patina",
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
