"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cx } from "./ui";

/**
 * Navigation am unteren Rand — dort, wo der Daumen ohnehin liegt, wenn man
 * das Handy einhändig am Spieltisch hält.
 */
const TABS = [
  { segment: "", label: "Kampf" },
  { segment: "spells", label: "Zauber" },
  { segment: "combat", label: "Angriffe" },
  { segment: "inventory", label: "Gepäck" },
  { segment: "sheet", label: "Bogen" },
  { segment: "notes", label: "Notizen" },
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
                  "flex min-h-14 flex-col items-center justify-center gap-1 text-[0.6875rem] font-semibold tracking-wide uppercase transition-colors",
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
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
