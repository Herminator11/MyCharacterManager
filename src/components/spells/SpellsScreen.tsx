"use client";

import { type ReactNode, useTransition } from "react";

import type { LiveState } from "@/lib/live-types";

import { CatalogSearch } from "./CatalogSearch";
import { SpellList, type SpellEntry } from "./SpellList";

/**
 * Klammert Zauberliste und Katalogsuche und leitet die Server Actions
 * durch. Beide Kinder sind Client-Komponenten, deshalb die Actions als
 * Props von der Seite herein.
 */
export function SpellsScreen({
  characterId,
  initial,
  spells,
  classKeys,
  customSpellForm,
  actions,
}: {
  characterId: number;
  initial: LiveState;
  spells: SpellEntry[];
  classKeys: string[];
  /** Serverseitig gerendertes Formular für eigene Zauber, kommt unter
   *  die Katalogsuche. Als Prop, weil es eine Server-Komponente ist. */
  customSpellForm: ReactNode;
  actions: {
    add: (characterId: number, spellId: number) => Promise<void>;
    remove: (characterId: number, spellId: number) => Promise<void>;
    setPrepared: (
      characterId: number,
      spellId: number,
      prepared: boolean,
    ) => Promise<void>;
    setFavorite: (
      characterId: number,
      spellId: number,
      favorite: boolean,
    ) => Promise<void>;
  };
}) {
  const [, startTransition] = useTransition();

  return (
    <div className="mx-auto max-w-2xl space-y-3">
      <SpellList
        initial={initial}
        spells={spells}
        onTogglePrepared={(spellId, prepared) =>
          startTransition(() =>
            actions.setPrepared(characterId, spellId, prepared),
          )
        }
        onToggleFavorite={(spellId, favorite) =>
          startTransition(() =>
            actions.setFavorite(characterId, spellId, favorite),
          )
        }
        onRemove={(spellId) =>
          startTransition(() => actions.remove(characterId, spellId))
        }
      />

      <CatalogSearch
        characterId={characterId}
        classKeys={classKeys}
        onAdd={(spellId) =>
          startTransition(() => actions.add(characterId, spellId))
        }
      />

      {customSpellForm}
    </div>
  );
}
