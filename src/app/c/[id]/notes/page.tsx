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
  setSessionAction,
} from "./actions";

export const dynamic = "force-dynamic";

type TimelineItem =
  | { type: "note"; id: number; at: number; body: string; session: number | null }
  | { type: "combat"; at: number; entries: LiveLogEntry[] };

export default async function CampaignLogPage({
  params,
}: PageProps<"/c/[id]">) {
  const { id } = await params;
  const characterId = characterIdFromParam(id);

  const character = getCharacter(characterId);
  if (!character) notFound();

  const notes = getCampaignLog(characterId);
  const combat = getCombatLog(characterId);

  // Zwei Quellen, eine Zeitleiste: von Hand notiert und von selbst
  // mitgeschrieben landen nach Zeitstempel gemischt — nur so sieht man
  // "wir haben X entdeckt" neben "wir haben gerade gekämpft". Der Kampf
  // selbst zählt dabei als ein einziger Moment, nicht als eine Zeile pro
  // Eintrag: Conditions und Rundendetails gehören zugeklappt, sonst
  // ertränkt ein einzelnes Gefecht jede handgeschriebene Notiz daneben.
  const timeline: TimelineItem[] = [
    ...notes.map((entry) => ({
      type: "note" as const,
      id: entry.id,
      at: entry.createdAt,
      body: entry.body,
      session: entry.session,
    })),
    ...(combat.length > 0
      ? [{ type: "combat" as const, at: combat[0].at, entries: combat }]
      : []),
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
            {timeline.map((item) =>
              item.type === "note" ? (
                <li key={`note-${item.id}`} className="flex gap-3">
                  {item.session ? (
                    <span className="w-20 shrink-0 text-xs font-semibold text-patina tabular-nums">
                      Session {item.session}
                    </span>
                  ) : null}
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
              ) : (
                <li key="combat">
                  <details className="group rounded-md border border-edge bg-ink px-3 py-2">
                    <summary className="flex min-h-8 cursor-pointer list-none items-center gap-2 text-sm font-medium text-mute [&::-webkit-details-marker]:hidden">
                      <CrossedSwordsIcon className="size-4 text-ember" />
                      <span className="flex-1">
                        Kampf ·{" "}
                        {item.entries.length === 1
                          ? "1 Eintrag"
                          : `${item.entries.length} Einträge`}
                      </span>
                      <ChevronDownIcon className="size-4 transition-transform group-open:rotate-180" />
                    </summary>
                    <div className="mt-3 space-y-3">
                      {groupByRound(item.entries).map(([round, entries]) => (
                        <div key={round}>
                          <p className="label mb-1 text-faint">Runde {round}</p>
                          <ul className="space-y-1">
                            {entries.map((entry) => (
                              <CombatLogRow key={entry.id} entry={entry} />
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </details>
                </li>
              ),
            )}
          </ul>
        </Panel>
      )}
    </>
  );
}
