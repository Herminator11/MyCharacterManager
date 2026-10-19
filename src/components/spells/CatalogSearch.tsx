"use client";

import { useEffect, useState, useTransition } from "react";

import { Button, Panel, SectionLabel } from "@/components/ui";
import { useT } from "@/lib/i18n/client";

export type CatalogHit = {
  id: number;
  name: string;
  level: number;
  school: string;
  castingTime: string;
  range: string;
  concentration: boolean;
  ritual: boolean;
};

/**
 * Suche im mitgelieferten SRD-Katalog.
 *
 * Läuft gegen einen Route Handler statt über eine Server Action, weil hier
 * bei jedem Tastendruck gesucht wird — ein voller Server-Roundtrip mit
 * Revalidierung wäre dafür zu schwer.
 */
export function CatalogSearch({
  characterId,
  classKeys,
  onAdd,
}: {
  characterId: number;
  /** Klassen des Charakters, für den Vorfilter auf die eigene Zauberliste. */
  classKeys: string[];
  onAdd: (spellId: number) => void;
}) {
  const t = useT();
  const [query, setQuery] = useState("");
  const [onlyMyClasses, setOnlyMyClasses] = useState(true);
  const [hits, setHits] = useState<CatalogHit[]>([]);
  const [loading, setLoading] = useState(false);
  const [, startTransition] = useTransition();

  useEffect(() => {
    if (query.trim().length < 2) {
      setHits([]);
      return;
    }

    // Kurz abwarten, statt bei jedem Buchstaben zu suchen.
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ q: query.trim() });
        if (onlyMyClasses && classKeys.length > 0) {
          params.set("classes", classKeys.join(","));
        }
        const response = await fetch(
          `/api/characters/${characterId}/catalog?${params}`,
        );
        if (response.ok) setHits((await response.json()) as CatalogHit[]);
      } finally {
        setLoading(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [query, onlyMyClasses, classKeys, characterId]);

  return (
    <Panel>
      <SectionLabel
        right={
          loading ? <span className="text-xs text-faint">{t.spells.searching}</span> : null
        }
      >
        {t.spells.catalogTitle}
      </SectionLabel>

      <input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder={t.spells.catalogSearch}
        aria-label={t.spells.catalogSearch}
        className="w-full min-h-11 rounded-md border border-edge bg-ink px-3 text-fg placeholder:text-faint focus:border-patina focus:outline-none"
      />

      {classKeys.length > 0 ? (
        <label className="mt-2.5 flex items-center gap-2 text-sm text-mute">
          <input
            type="checkbox"
            checked={onlyMyClasses}
            onChange={(event) => setOnlyMyClasses(event.target.checked)}
            className="size-4 accent-[var(--color-patina)]"
          />
          {t.spells.onlyMyClasses}
        </label>
      ) : null}

      {query.trim().length >= 2 && hits.length === 0 && !loading ? (
        <p className="mt-3 text-sm text-faint">
          {t.spells.nothingFound}
        </p>
      ) : null}

      {hits.length > 0 ? (
        <ul className="mt-3 divide-y divide-edge">
          {hits.map((hit) => (
            <li key={hit.id} className="flex items-center gap-2 py-1.5">
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1.5 truncate text-sm font-medium">
                  {hit.name}
                  {hit.concentration ? (
                    <span className="shrink-0 rounded bg-brass/15 px-1 text-[0.625rem] font-semibold text-brass">
                      {t.term.concentrationMark}
                    </span>
                  ) : null}
                </p>
                <p className="truncate text-xs text-faint">
                  {hit.level === 0 ? t.term.cantrip : t.term.spellLevel(hit.level)}
                  {hit.school ? ` · ${hit.school}` : ""}
                  {hit.castingTime ? ` · ${hit.castingTime}` : ""}
                </p>
              </div>
              <Button
                size="sm"
                onClick={() => {
                  // Sofort aus der Trefferliste nehmen, damit man nicht
                  // versehentlich zweimal auf denselben Zauber tippt.
                  setHits((current) => current.filter((h) => h.id !== hit.id));
                  startTransition(() => onAdd(hit.id));
                }}
              >
                {t.common.add}
              </Button>
            </li>
          ))}
        </ul>
      ) : null}
    </Panel>
  );
}
