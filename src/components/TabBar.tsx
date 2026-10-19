"use client";

import Link from "next/link";
import { useSelectedLayoutSegment } from "next/navigation";

import { characterPath } from "@/lib/characterUrl";

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

export function TabBar({
  characterId,
  characterName,
}: {
  characterId: number;
  characterName: string;
}) {
  // Das Segment unter /c/[id] statt des ganzen Pfads: der Vergleich mit
  // dem kanonischen Slug schlug bei /c/5, einem alten Slug nach dem
  // Umbenennen oder einem kodierten Umlaut fehl — dann war kein Reiter
  // aktiv, und Übersicht und Zauber sahen gleich aus.
  const segment = useSelectedLayoutSegment() ?? "";
  const base = characterPath(characterId, characterName);

  return (
    <nav
      // Deckend: bei /95 mit Blur schien in Safari der Text darunter durch.
      className="fixed inset-x-0 bottom-0 z-30 border-t border-edge bg-panel"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      {/* Seitenabstand, damit "Übersicht" und "Notizen" nicht am
          Bildschirmrand kleben — bei sechs Reitern auf 390 px zählt jeder
          Pixel, deshalb auch Normalschrift statt gesperrter Versalien. */}
      <ul className="mx-auto flex max-w-2xl px-2">
        {TABS.map((tab) => {
          const href = tab.segment ? `${base}/${tab.segment}` : base;
          const active = segment === tab.segment;

          return (
            <li key={tab.segment} className="flex-1">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cx(
                  "flex min-h-14 flex-col items-center justify-center gap-0.5 py-1.5 text-[0.6875rem] leading-tight font-semibold transition-colors",
                  active ? "text-patina" : "text-faint hover:text-fg",
                )}
              >
                {/* Der aktive Reiter bekommt eine Marke oben, damit man ihn
                    auch im Augenwinkel erkennt. */}
                <span
                  className={cx(
                    "h-[3px] w-7 rounded-full transition-colors",
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
