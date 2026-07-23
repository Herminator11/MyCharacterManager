import { notFound } from "next/navigation";

import { NotesTabs } from "@/components/notes/NotesTabs";
import { characterIdFromParam, characterPath } from "@/lib/characterUrl";
import { getCharacter } from "@/lib/server/characters";

export default async function NotesLayout({
  children,
  params,
}: LayoutProps<"/c/[id]">) {
  const { id } = await params;
  const characterId = characterIdFromParam(id);

  const character = getCharacter(characterId);
  if (!character) notFound();

  return (
    <div className="mx-auto max-w-2xl space-y-3">
      <NotesTabs base={characterPath(characterId, character.name, "/notes")} />
      {children}
    </div>
  );
}
