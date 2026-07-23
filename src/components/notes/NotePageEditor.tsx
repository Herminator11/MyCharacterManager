"use client";

import { useEffect, useRef, useState, useTransition } from "react";

import { TrashIcon } from "@/components/icons";
import { inputClass } from "@/components/ui";

export type NotePage = { id: number; title: string; body: string };

/**
 * Titel und Text speichern automatisch — kein Knopf, der vergessen werden
 * kann. Sofort beim Verlassen des Feldes, zusätzlich nach einer Sekunde
 * Tippsause, falls der Tab geschlossen wird, ohne dass je der Fokus
 * wechselt.
 */
export function NotePageEditor({
  page,
  save,
  remove,
}: {
  page: NotePage;
  save: (title: string, body: string) => Promise<void>;
  remove: () => Promise<void>;
}) {
  const [title, setTitle] = useState(page.title);
  const [body, setBody] = useState(page.body);
  const saved = useRef({ title: page.title, body: page.body });
  const [, startTransition] = useTransition();

  const flush = () => {
    if (title === saved.current.title && body === saved.current.body) return;
    saved.current = { title, body };
    startTransition(() => save(title, body));
  };

  useEffect(() => {
    // Kurz abwarten, statt bei jedem Tastendruck zu speichern.
    const timer = setTimeout(flush, 1000);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, body]);

  return (
    <div>
      <div className="flex items-center gap-2">
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          onBlur={flush}
          aria-label="Titel der Notiz"
          className={`${inputClass} font-semibold`}
        />
        <button
          type="button"
          onClick={() => startTransition(remove)}
          aria-label="Diese Seite löschen"
          className="flex min-h-11 w-11 shrink-0 items-center justify-center rounded-md text-faint transition-colors hover:text-ember"
        >
          <TrashIcon className="size-4" />
        </button>
      </div>
      <textarea
        value={body}
        onChange={(event) => setBody(event.target.value)}
        onBlur={flush}
        rows={10}
        placeholder="Markdown ist willkommen — gespeichert wird der Rohtext."
        aria-label="Inhalt der Notiz"
        className="mt-2.5 w-full rounded-md border border-edge bg-ink px-3 py-2.5 font-mono text-sm text-fg placeholder:text-faint focus:border-patina focus:outline-none"
      />
    </div>
  );
}
