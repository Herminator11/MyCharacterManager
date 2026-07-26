import { notFound } from "next/navigation";

import { AddIcon } from "@/components/icons";
import { CombatLogRow } from "@/components/play/CombatLog";
import { Button, Panel, SectionLabel } from "@/components/ui";
import { characterIdFromParam } from "@/lib/characterUrl";
import type { LiveLogEntry } from "@/lib/live-types";
import {
  getCampaignLog,
  getCharacter,
  getCombatLog,
} from "@/lib/server/characters";

import {
  addCampaignLogAction,
  bumpSessionAction,
  removeCampaignLogAction,
} from "./actions";

export const dynamic = "force-dynamic";

/** Volles Datum — hier liest man auch Monate später noch nach. */
function formatStamp(unixSeconds: number): string {
  return new Date(unixSeconds * 1000).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  });
}

type TimelineItem =
  | { type: "note"; id: number; at: number; body: string; session: number | null }
  | { type: "combat"; id: number; at: number; entry: LiveLogEntry };

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
  // "wir haben X entdeckt" neben "wir haben gerade gekämpft".
  const timeline: TimelineItem[] = [
    ...notes.map((entry) => ({
      type: "note" as const,
      id: entry.id,
      at: entry.createdAt,
      body: entry.body,
      session: entry.session,
    })),
    ...combat.map((entry) => ({
      type: "combat" as const,
      id: entry.id,
      at: entry.at,
      entry,
    })),
  ].sort((a, b) => b.at - a.at || b.id - a.id);

  return (
    <>
      <Panel>
        <SectionLabel
          right={
            <form
              action={async () => {
                "use server";
                await bumpSessionAction(characterId);
              }}
            >
              <button
                type="submit"
                className="text-xs text-mute transition-colors hover:text-patina"
              >
                {character.currentSession > 0
                  ? `Session ${character.currentSession} · nächste →`
                  : "Erste Session beginnen"}
              </button>
            </form>
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
                  <div className="w-20 shrink-0">
                    {item.session ? (
                      <span className="block text-xs font-semibold text-patina tabular-nums">
                        Session {item.session}
                      </span>
                    ) : null}
                    <time className="block text-xs text-faint tabular-nums">
                      {formatStamp(item.at)}
                    </time>
                  </div>
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
                <CombatLogRow
                  key={`combat-${item.id}`}
                  entry={item.entry}
                  timestamp={formatStamp(item.at)}
                />
              ),
            )}
          </ul>
        </Panel>
      )}
    </>
  );
}
