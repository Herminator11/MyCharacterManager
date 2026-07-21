"use client";

import { useRef, useState, useTransition } from "react";

import { Button, Panel, SectionLabel } from "@/components/ui";

export type LogEntry = { id: number; body: string; createdAt: number };

/**
 * Schnell festhalten, was gerade passiert ist.
 *
 * Der Zettel neben dem Charakterbogen geht verloren — und der Grund, warum
 * man trotzdem zum Zettel greift, ist die Hürde: Notizseite anlegen, Titel
 * ausdenken, tippen. Hier ist es ein Feld und die Eingabetaste. Das Datum
 * kommt von selbst.
 *
 * Die letzten Einträge stehen darunter, damit man sieht, dass es ankam.
 * Alles Ältere steht im Logbuch unter Notizen.
 */
export function QuickLog({
  recent,
  add,
}: {
  recent: LogEntry[];
  add: (body: string) => Promise<void>;
}) {
  const [text, setText] = useState("");
  const [pending, startTransition] = useTransition();
  const field = useRef<HTMLInputElement>(null);

  const commit = () => {
    const body = text.trim();
    if (!body) return;

    // Sofort leeren: der nächste Satz kommt oft direkt hinterher, und auf
    // die Serverantwort zu warten würde den Gedanken abschneiden.
    setText("");
    startTransition(async () => {
      await add(body);
      field.current?.focus();
    });
  };

  return (
    <Panel>
      <SectionLabel>Festhalten</SectionLabel>

      <div className="flex gap-2">
        <input
          ref={field}
          value={text}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") commit();
          }}
          placeholder="Was ist passiert?"
          aria-label="Ereignis festhalten"
          className="min-h-12 min-w-0 flex-1 rounded-md border border-edge bg-ink px-3 text-fg placeholder:text-faint focus:border-patina focus:outline-none"
        />
        <Button onClick={commit} disabled={pending || !text.trim()}>
          Notieren
        </Button>
      </div>

      {recent.length > 0 ? (
        <ul className="mt-3 space-y-1.5">
          {recent.map((entry) => (
            <li key={entry.id} className="flex gap-2.5 text-sm">
              <time className="shrink-0 text-xs text-faint tabular-nums">
                {formatDay(entry.createdAt)}
              </time>
              <span className="min-w-0 text-mute">{entry.body}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </Panel>
  );
}

/** Tag und Monat reichen — das Jahr steht im Logbuch. */
function formatDay(unixSeconds: number): string {
  return new Date(unixSeconds * 1000).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
  });
}
