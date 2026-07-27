import { notFound } from "next/navigation";

import { AddIcon, ChevronDownIcon, CrossedSwordsIcon } from "@/components/icons";
import { CombatLogRow } from "@/components/play/CombatLog";
import { Button, Panel, SectionLabel } from "@/components/ui";
import { characterIdFromParam } from "@/lib/characterUrl";
import type { LiveLogEntry } from "@/lib/live-types";
import { groupByRound } from "@/lib/rules/combatLog";
import {
  getCampaignLog,
  getCharacter,
  getCombatLog,
} from "@/lib/server/characters";

import {
  addCampaignLogAction,
  bumpSessionAction,
  removeCampaignLogAction,
  removeCombatLogAction,
  setSessionAction,
} from "./actions";

export const dynamic = "force-dynamic";

type NoteEntry = { id: number; body: string };

type TimelineItem =
  | { type: "note"; id: number; at: number; body: string }
  | { type: "combat"; at: number; entries: LiveLogEntry[] }
  | {
      type: "session";
      session: number;
      at: number;
      notes: NoteEntry[];
      combat: LiveLogEntry[];
    };

export default async function CampaignLogPage({
  params,
}: PageProps<"/c/[id]">) {
  const { id } = await params;
  const characterId = characterIdFromParam(id);

  const character = getCharacter(characterId);
  if (!character) notFound();

  const notes = getCampaignLog(characterId);
  const combat = getCombatLog(characterId);

  // Von Hand notiert und von selbst mitgeschrieben landen zusammen, sobald
  // beide dieselbe Session tragen — sonst bleiben sie einzelne Momente in
  // der Zeitleiste. So lässt sich "Session 2" einmal aufklappen, statt jede
  // Notiz und jeden Kampf einzeln danach abzusuchen.
  const sessions = new Map<
    number,
    { at: number; notes: NoteEntry[]; combat: LiveLogEntry[] }
  >();
  const bucket = (session: number) => {
    let entry = sessions.get(session);
    if (!entry) {
      entry = { at: 0, notes: [], combat: [] };
      sessions.set(session, entry);
    }
    return entry;
  };

  const looseNotes: typeof notes = [];
  for (const note of notes) {
    if (note.session) {
      const entry = bucket(note.session);
      entry.notes.push(note);
      entry.at = Math.max(entry.at, note.createdAt);
    } else {
      looseNotes.push(note);
    }
  }

  const looseCombat: typeof combat = [];
  for (const line of combat) {
    if (line.session) {
      const entry = bucket(line.session);
      entry.combat.push(line);
      entry.at = Math.max(entry.at, line.at);
    } else {
      looseCombat.push(line);
    }
  }

  const timeline: TimelineItem[] = [
    ...looseNotes.map((entry) => ({
      type: "note" as const,
      id: entry.id,
      at: entry.createdAt,
      body: entry.body,
    })),
    ...(looseCombat.length > 0
      ? [{ type: "combat" as const, at: looseCombat[0].at, entries: looseCombat }]
      : []),
    ...[...sessions.entries()].map(([session, entry]) => ({
      type: "session" as const,
      session,
      at: entry.at,
      notes: entry.notes,
      combat: entry.combat,
    })),
  ].sort((a, b) => b.at - a.at);

  return (
    <>
      <Panel>
        <SectionLabel
          right={
            <div className="flex items-center gap-2 text-xs text-mute">
              <span>Session</span>
              <form
                action={async (formData: FormData) => {
                  "use server";
                  await setSessionAction(
                    characterId,
                    Number(formData.get("session")),
                  );
                }}
              >
                <input
                  name="session"
                  type="number"
                  min={0}
                  defaultValue={character.currentSession}
                  aria-label="Session-Nummer setzen"
                  className="min-h-8 w-14 rounded-md border border-edge bg-ink px-1.5 text-center tabular-nums focus:border-patina focus:outline-none"
                />
                <button type="submit" className="sr-only">
                  Session-Nummer speichern
                </button>
              </form>
              <form
                action={async () => {
                  "use server";
                  await bumpSessionAction(characterId);
                }}
              >
                <button
                  type="submit"
                  className="transition-colors hover:text-patina"
                >
                  nächste →
                </button>
              </form>
            </div>
          }
        >
          Festhalten
        </SectionLabel>
        <form
          action={async (formData: FormData) => {
            "use server";
            await addCampaignLogAction(characterId, formData);
          }}
          className="flex gap-2"
        >
          <input
            name="body"
            required
            placeholder="Was ist gerade passiert?"
            aria-label="Ereignis festhalten"
            className="min-h-12 min-w-0 flex-1 rounded-md border border-edge bg-ink px-3 text-fg placeholder:text-faint focus:border-patina focus:outline-none"
          />
          <Button type="submit">
            <AddIcon />
            Notieren
          </Button>
        </form>
      </Panel>

      {timeline.length === 0 ? (
        <p className="text-sm text-faint">
          Noch nichts festgehalten. Ein Satz, Eingabetaste, fertig — Kämpfe
          tragen sich von selbst ein, solange der nächste noch nicht
          begonnen hat.
        </p>
      ) : (
        <Panel>
          <SectionLabel>Verlauf</SectionLabel>
          <ul className="space-y-2.5">
            {timeline.map((item) => {
              if (item.type === "note") {
                return (
                  <li key={`note-${item.id}`} className="flex gap-3">
                    <p className="min-w-0 flex-1 text-sm whitespace-pre-line">
                      {item.body}
                    </p>
                    <form
                      action={async () => {
                        "use server";
                        await removeCampaignLogAction(characterId, item.id);
                      }}
                    >
                      <button
                        type="submit"
                        aria-label="Eintrag löschen"
                        className="px-1 text-faint transition-colors hover:text-ember"
                      >
                        ✕
                      </button>
                    </form>
                  </li>
                );
              }

              if (item.type === "combat") {
                return (
                  <li key="combat">
                    <CombatBlock
                      entries={item.entries}
                      remove={async () => {
                        "use server";
                        await removeCombatLogAction(characterId);
                      }}
                    />
                  </li>
                );
              }

              return (
                <li key={`session-${item.session}`}>
                  <details className="group">
                    <summary className="flex cursor-pointer list-none items-center gap-3 text-sm [&::-webkit-details-marker]:hidden">
                      <span className="min-w-0 flex-1 font-semibold text-patina">
                        Session {item.session}
                      </span>
                      <ChevronDownIcon className="size-4 shrink-0 text-faint transition-transform group-open:rotate-180" />
                    </summary>
                    <div className="mt-2 ml-1 space-y-2.5 border-l border-edge pl-3">
                      {item.notes.map((note) => (
                        <div key={note.id} className="flex gap-3">
                          <p className="min-w-0 flex-1 text-sm whitespace-pre-line">
                            {note.body}
                          </p>
                          <form
                            action={async () => {
                              "use server";
                              await removeCampaignLogAction(characterId, note.id);
                            }}
                          >
                            <button
                              type="submit"
                              aria-label="Eintrag löschen"
                              className="px-1 text-faint transition-colors hover:text-ember"
                            >
                              ✕
                            </button>
                          </form>
                        </div>
                      ))}
                      {item.combat.length > 0 ? (
                        <CombatBlock
                          entries={item.combat}
                          remove={async () => {
                            "use server";
                            await removeCombatLogAction(characterId);
                          }}
                        />
                      ) : null}
                    </div>
                  </details>
                </li>
              );
            })}
          </ul>
        </Panel>
      )}
    </>
  );
}

/**
 * Der eingeklappte Kampf — wiederverwendet, egal ob lose oder in einer
 * Session. Der Löschen-Knopf steht bewusst außerhalb von `<summary>`: ein
 * Klick darin würde sonst zusätzlich das Aufklappen auslösen, das
 * `<details>` jedem Klick auf seinen Kopf mitgibt.
 */
function CombatBlock({
  entries,
  remove,
}: {
  entries: LiveLogEntry[];
  remove: () => Promise<void>;
}) {
  return (
    <div className="flex items-start gap-3">
      <details className="group min-w-0 flex-1">
        <summary className="flex cursor-pointer list-none items-center gap-3 text-sm [&::-webkit-details-marker]:hidden">
          <CrossedSwordsIcon className="size-4 shrink-0 text-ember" />
          <span className="min-w-0 flex-1">
            Kampf · {entries.length === 1 ? "1 Eintrag" : `${entries.length} Einträge`}
          </span>
          <ChevronDownIcon className="size-4 shrink-0 text-faint transition-transform group-open:rotate-180" />
        </summary>
        <div className="mt-2 ml-7 space-y-3">
          {groupByRound(entries).map(([round, roundEntries]) => (
            <div key={round}>
              <p className="label mb-1 text-faint">Runde {round}</p>
              <ul className="space-y-1">
                {roundEntries.map((entry) => (
                  <CombatLogRow key={entry.id} entry={entry} />
                ))}
              </ul>
            </div>
          ))}
        </div>
      </details>
      <form action={remove}>
        <button
          type="submit"
          aria-label="Kampf-Log löschen"
          className="px-1 text-faint transition-colors hover:text-ember"
        >
          ✕
        </button>
      </form>
    </div>
  );
}
