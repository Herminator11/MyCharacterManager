import { notFound } from "next/navigation";

import { PinnedNotes } from "@/components/notes/PinnedNotes";
import { QuickLog } from "@/components/notes/QuickLog";
import { Dashboard } from "@/components/play/Dashboard";
import { ProfileHeader } from "@/components/profile/ProfileHeader";
import { AbilityPanel } from "@/components/sheet/AbilityPanel";
import { LiveProvider } from "@/lib/live-context";
import { CLASSES } from "@/lib/rules/classes";
import {
  getLiveState,
  getLogEntries,
  getPins,
  getSheet,
  listConditions,
} from "@/lib/server/characters";

import {
  addLogEntryAction,
  addPinAction,
  resolvePinAction,
} from "./notes/actions";
import { saveAbilityScoresAction } from "./sheet/actions";
import { uploadPortraitAction } from "./portrait-actions";

export const dynamic = "force-dynamic";

export default async function PlayPage({ params }: PageProps<"/c/[id]">) {
  const { id } = await params;
  const characterId = Number(id);

  const initial = getLiveState(characterId);
  const sheet = getSheet(characterId);
  if (!initial || !sheet) notFound();

  const abilities = sheet.abilities.map((ability) => ({
    key: ability.key,
    score: ability.score,
    modifier: ability.modifier,
    save: ability.save,
    saveProficient: ability.proficient,
    skills: sheet.skills
      .filter((skill) => skill.ability === ability.key)
      .map((skill) => ({
        key: skill.key,
        name: skill.name,
        de: skill.de,
        bonus: skill.bonus,
        level: skill.level,
      })),
  }));

  return (
    // Ein Live-Zustand für die ganze Seite: der Profilkopf zeigt die
    // Inspiration, der Kampfblock alles Übrige — beide an einem Stream.
    <LiveProvider initial={initial}>
      <div className="space-y-3">
        <ProfileHeader
          sheet={sheet}
          uploadPortrait={async (formData: FormData) => {
            "use server";
            return uploadPortraitAction(characterId, formData);
          }}
        />

        <PinnedNotes
          pins={getPins(characterId).map((pin) => ({
            id: pin.id,
            title: pin.title,
            body: pin.body,
          }))}
          add={async (formData: FormData) => {
            "use server";
            await addPinAction(characterId, formData);
          }}
          resolve={async (noteId: number) => {
            "use server";
            await resolvePinAction(characterId, noteId);
          }}
        />

        {/*
          Am Laptop nebeneinander: links die Werte, die man nachschlägt,
          rechts die, die man im Kampf verändert. So muss man mitten im
          Gefecht nie den Reiter wechseln, um seinen Rettungswurf zu finden.
          Unter 1024 px stapelt sich beides — und das Kampf-Panel steht dann
          oben, weil es am Tisch das Wichtigere ist.
        */}
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-start">
          {/* min-w-0: Grid-Kinder schrumpfen sonst nicht unter die Breite
              ihres längsten Inhalts — die Fertigkeitsnamen würden die Spalte
              am Handy über den Bildschirmrand hinausdrücken. */}
          <div className="order-2 min-w-0 space-y-3 lg:order-1">
            <AbilityPanel
              abilities={abilities}
              save={async (scores: Record<string, number>) => {
                "use server";
                await saveAbilityScoresAction(characterId, scores);
              }}
            />

            {/* Steht in der Nachschlage-Spalte, nicht in der Kampf-Spalte:
                festhalten tut man zwischen den Würfen, nicht mittendrin. */}
            <QuickLog
              recent={getLogEntries(characterId, 3).map((entry) => ({
                id: entry.id,
                body: entry.body,
                createdAt: entry.createdAt,
              }))}
              add={async (body: string) => {
                "use server";
                await addLogEntryAction(characterId, body);
              }}
            />
          </div>

          <div className="order-1 min-w-0 lg:order-2">
            <Dashboard
              conditions={listConditions().map((c) => ({
                key: c.key,
                name: c.name,
                description: c.description,
              }))}
              classLabels={Object.fromEntries(CLASSES.map((c) => [c.key, c.name]))}
            />
          </div>
        </div>
      </div>
    </LiveProvider>
  );
}
