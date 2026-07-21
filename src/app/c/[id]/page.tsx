import { notFound } from "next/navigation";

import { Dashboard } from "@/components/play/Dashboard";
import { ProfileHeader } from "@/components/profile/ProfileHeader";
import { AbilityPanel } from "@/components/sheet/AbilityPanel";
import { CLASSES } from "@/lib/rules/classes";
import {
  getLiveState,
  getSheet,
  listConditions,
} from "@/lib/server/characters";

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
    <div className="space-y-3">
      <ProfileHeader
        sheet={sheet}
        uploadPortrait={async (formData: FormData) => {
          "use server";
          return uploadPortraitAction(characterId, formData);
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
        <div className="order-2 min-w-0 lg:order-1">
          <AbilityPanel
            abilities={abilities}
            save={async (scores: Record<string, number>) => {
              "use server";
              await saveAbilityScoresAction(characterId, scores);
            }}
          />
        </div>

        <div className="order-1 min-w-0 lg:order-2">
          <Dashboard
            initial={initial}
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
  );
}
