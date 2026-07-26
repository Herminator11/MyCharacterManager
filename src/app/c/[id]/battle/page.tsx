import { notFound } from "next/navigation";

import { BattleMode } from "@/components/play/BattleMode";
import { characterIdFromParam } from "@/lib/characterUrl";
import { LiveProvider } from "@/lib/live-context";
import { abilityModifier, attackBonus, formatModifier } from "@/lib/rules/derive";
import {
  getAttacks,
  getCharacter,
  getCharacterSpells,
  getLiveState,
  getSheet,
  listConditions,
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
  const sheet = getSheet(characterId);
  if (!initial || !character || !sheet) notFound();

  const attacks = getAttacks(characterId).map((attack) => {
    const bonus =
      attack.attackBonusOverride ??
      attackBonus(sheet.scores, attack.ability, attack.proficient, sheet.classes);
    const damageBonus =
      attack.damageBonusOverride ?? abilityModifier(sheet.scores[attack.ability]);

    return {
      id: attack.id,
      name: attack.name,
      bonus,
      // Dieselbe Zusammensetzung wie im Angriffe-Tab: Würfel und Bonus
      // ohne Leerzeichen ("1d8+3"), die Schadensart danach abgesetzt.
      damageLine:
        attack.damageDice +
        (damageBonus !== 0 ? formatModifier(damageBonus) : "") +
        (attack.damageType ? ` ${attack.damageType}` : ""),
    };
  });

  const conditions = listConditions().map((c) => ({
    key: c.key,
    name: c.name,
    description: c.description,
  }));

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
      <BattleMode
        favorites={favorites}
        attacks={attacks}
        conditions={conditions}
        characterName={character.name}
      />
    </LiveProvider>
  );
}
