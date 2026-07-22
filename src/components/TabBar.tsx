"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  BackpackIcon,
  BookIcon,
  BustIcon,
  SheetIcon,
  SparkIcon,
  SwordIcon,
} from "./icons";
import { cx } from "./ui";

/**
 * Navigation am unteren Rand — dort, wo der Daumen ohnehin liegt, wenn man
 * das Handy einhändig am Spieltisch hält.
 */
const TABS = [
  { segment: "", label: "Übersicht", Icon: BustIcon },
  { segment: "spells", label: "Zauber", Icon: SparkIcon },
  { segment: "combat", label: "Angriffe", Icon: SwordIcon },
  { segment: "inventory", label: "Gepäck", Icon: BackpackIcon },
  { segment: "sheet", label: "Bogen", Icon: SheetIcon },
  { segment: "notes", label: "Notizen", Icon: BookIcon },
] as const;

export function TabBar({ characterId }: { characterId: number }) {
  const pathname = usePathname();
  const base = `/c/${characterId}`;

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 border-t border-edge bg-panel/95 backdrop-blur"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="mx-auto flex max-w-2xl">
        {TABS.map((tab) => {
          const href = tab.segment ? `${base}/${tab.segment}` : base;
          const active = pathname === href;

          return (
            <li key={tab.segment} className="flex-1">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cx(
                  "flex min-h-14 flex-col items-center justify-center gap-0.5 py-1.5 text-[0.625rem] font-semibold tracking-wide uppercase transition-colors",
                  active ? "text-patina" : "text-faint hover:text-mute",
                )}
              >
                {/* Der aktive Reiter bekommt eine Marke oben, damit man ihn
                    auch im Augenwinkel erkennt. */}
                <span
                  className={cx(
                    "h-0.5 w-6 rounded-full transition-colors",
                    active ? "bg-patina" : "bg-transparent",
                  )}
                />
                {/* Zeichen über dem Wort: die Leiste liegt unter dem
                    Daumen und wird im Halbdunkel eher an der Form als am
                    Wort wiedererkannt. Das Wort bleibt trotzdem stehen —
                    sechs Formen auswendig zu lernen ist kein Fortschritt. */}
                <tab.Icon className="size-[1.15rem]" />
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
