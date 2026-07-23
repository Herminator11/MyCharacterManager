import { notFound } from "next/navigation";

import { BattleMode } from "@/components/play/BattleMode";
import { characterIdFromParam } from "@/lib/characterUrl";
import { LiveProvider } from "@/lib/live-context";
import {
  getCharacter,
  getCharacterSpells,
  getLiveState,
} from "@/lib/server/characters";

export const dynamic = "force-dynamic";

/**
 * Der Kampfmodus hinter "Roll Initiative…".
 *
 * Eigene Route statt eines Umschalters auf der Übersicht, damit der
 * Zurück-Knopf des Handys tut, was man erwartet: aus dem Kampf zurück zur
 * Übersicht, nicht aus der App.
 */
export default async function BattlePage({ params }: PageProps<"/c/[id]/battle">) {
  const { id } = await params;
  const characterId = characterIdFromParam(id);

  const initial = getLiveState(characterId);
  const character = getCharacter(characterId);
  if (!initial || !character) notFound();

  const favorites = getCharacterSpells(characterId)
    .filter(({ entry }) => entry.favorite)
    .map(({ spell }) => ({
      id: spell.id,
      name: spell.name,
      level: spell.level,
      school: spell.school,
      castingTime: spell.castingTime,
      range: spell.range,
      components: spell.components,
      duration: spell.duration,
      concentration: spell.concentration,
      ritual: spell.ritual,
      description: spell.description,
      higherLevel: spell.higherLevel,
      damageAtSlotLevel: spell.damageAtSlotLevel,
      damageType: spell.damageType,
    }));

  return (
    <LiveProvider initial={initial}>
      <BattleMode favorites={favorites} characterName={character.name} />
    </LiveProvider>
  );
}
