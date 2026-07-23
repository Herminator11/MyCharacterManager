import { notFound } from "next/navigation";

import { Button, Panel, SectionLabel } from "@/components/ui";
import { characterIdFromParam } from "@/lib/characterUrl";
import { getCampaignLog, getCharacter } from "@/lib/server/characters";

import { addCampaignLogAction, removeCampaignLogAction } from "../actions";

export const dynamic = "force-dynamic";

/** Volles Datum — hier liest man auch Monate später noch nach. */
function formatStamp(unixSeconds: number): string {
  return new Date(unixSeconds * 1000).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  });
}

export default async function CampaignLogPage({
  params,
}: PageProps<"/c/[id]">) {
  const { id } = await params;
  const characterId = characterIdFromParam(id);

  const character = getCharacter(characterId);
  if (!character) notFound();

  const entries = getCampaignLog(characterId);

  return (
    <>
      <Panel>
        <SectionLabel>Festhalten</SectionLabel>
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
          <Button type="submit">Notieren</Button>
        </form>
      </Panel>

      {entries.length === 0 ? (
        <p className="text-sm text-faint">
          Noch nichts festgehalten. Ein Satz, Eingabetaste, fertig.
        </p>
      ) : (
        <Panel className="space-y-2.5">
          {entries.map((entry) => (
            <div key={entry.id} className="flex gap-3">
              <time className="w-20 shrink-0 text-xs text-faint tabular-nums">
                {formatStamp(entry.createdAt)}
              </time>
              <p className="min-w-0 flex-1 text-sm whitespace-pre-line">
                {entry.body}
              </p>
              <form
                action={async () => {
                  "use server";
                  await removeCampaignLogAction(characterId, entry.id);
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
        </Panel>
      )}
    </>
  );
}
