import { notFound } from "next/navigation";

import { CustomSpellForm } from "@/components/spells/CustomSpellForm";
import { SpellsScreen } from "@/components/spells/SpellsScreen";
import { characterIdFromParam } from "@/lib/characterUrl";
import {
  getCharacterSpells,
  getClasses,
  getLiveState,
} from "@/lib/server/characters";

import {
  addSpellAction,
  createCustomSpellAction,
  removeSpellAction,
  setPreparedAction,
  setSpellFavoriteAction,
} from "./actions";

export const dynamic = "force-dynamic";

export default async function SpellsPage({ params }: PageProps<"/c/[id]">) {
  const { id } = await params;
  const characterId = characterIdFromParam(id);

  const initial = getLiveState(characterId);
  if (!initial) notFound();

  const entries = getCharacterSpells(characterId).map(({ entry, spell }) => ({
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
    prepared: entry.prepared,
    alwaysPrepared: entry.alwaysPrepared,
    favorite: entry.favorite,
  }));

  return (
    <SpellsScreen
      characterId={characterId}
      initial={initial}
      spells={entries}
      classKeys={getClasses(characterId).map((c) => c.classKey)}
      customSpellForm={
        <CustomSpellForm
          action={async (formData: FormData) => {
            "use server";
            await createCustomSpellAction(characterId, formData);
          }}
        />
      }
      actions={{
        add: addSpellAction,
        remove: removeSpellAction,
        setPrepared: setPreparedAction,
        setFavorite: setSpellFavoriteAction,
      }}
    />
  );
}
