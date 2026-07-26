"use client";

import { useEffect, useRef, useState, useTransition } from "react";

import { TrashIcon } from "@/components/icons";
import { inputClass } from "@/components/ui";

export type Feature = { id: number; title: string; body: string };

/**
 * Name und Beschreibung speichern automatisch — kein Knopf.
 * Der Name ist dabei standardmäßig nur Text — ein Doppelklick macht ihn
 * zum Eingabefeld. Ein einzelner Klick soll beim Lesen nicht aus Versehen
 * den Titel zum Bearbeiten öffnen.
 */
export function FeatureEditor({
  feature,
  save,
  remove,
}: {
  feature: Feature;
  save: (name: string, description: string) => Promise<void>;
  remove: () => Promise<void>;
}) {
  const [title, setTitle] = useState(feature.title);
  const [body, setBody] = useState(feature.body);
  const [editingTitle, setEditingTitle] = useState(false);
  const saved = useRef({ title: feature.title, body: feature.body });
  const [, startTransition] = useTransition();

  const flush = () => {
    if (title === saved.current.title && body === saved.current.body) return;
    saved.current = { title, body };
    startTransition(() => save(title, body));
  };

  useEffect(() => {
    const timer = setTimeout(flush, 1000);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, body]);

  return (
    <div>
      <div className="flex items-center gap-2">
        {editingTitle ? (
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            onBlur={() => {
              flush();
              setEditingTitle(false);
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") event.currentTarget.blur();
            }}
            autoFocus
            aria-label="Name der Fähigkeit"
            className={`${inputClass} font-semibold`}
          />
        ) : (
          <h3
            onDoubleClick={() => setEditingTitle(true)}
            title="Doppelklick zum Umbenennen"
            className="min-h-11 flex-1 cursor-text content-center truncate text-sm font-semibold"
          >
            {title}
          </h3>
        )}
        <button
          type="button"
          onClick={() => startTransition(remove)}
          aria-label={`${title} entfernen`}
          className="flex min-h-11 w-11 shrink-0 items-center justify-center rounded-md text-faint transition-colors hover:text-ember"
        >
          <TrashIcon className="size-4" />
        </button>
      </div>
      <textarea
        value={body}
        onChange={(event) => setBody(event.target.value)}
        onBlur={flush}
        rows={2}
        placeholder="Kurzbeschreibung"
        aria-label="Beschreibung"
        className="mt-1.5 w-full rounded-md border border-edge bg-ink px-3 py-2 text-sm text-fg placeholder:text-faint focus:border-patina focus:outline-none"
      />
    </div>
  );
}
