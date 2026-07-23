import { notFound } from "next/navigation";

import { NotePageEditor } from "@/components/notes/NotePageEditor";
import { Panel, SectionLabel } from "@/components/ui";
import { characterIdFromParam } from "@/lib/characterUrl";
import { getCharacter, getNotes } from "@/lib/server/characters";

import { addNoteAction, removeNoteAction, saveNoteAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function NotesPage({ params }: PageProps<"/c/[id]">) {
  const { id } = await params;
  const characterId = characterIdFromParam(id);

  const character = getCharacter(characterId);
  if (!character) notFound();

  const pages = getNotes(characterId);

  return (
    <div>
      <SectionLabel
        right={
          <form
            action={async () => {
              "use server";
              await addNoteAction(characterId);
            }}
          >
            <button
              type="submit"
              className="text-xs text-patina underline-offset-4 hover:underline"
            >
              Neue Seite
            </button>
          </form>
        }
      >
        Notizseiten
      </SectionLabel>

      {pages.length > 0 ? (
        <p className="mb-2 text-xs text-faint">
          Speichert automatisch — Feld verlassen genügt.
        </p>
      ) : null}

      {pages.length === 0 ? (
        <p className="text-sm text-faint">
          Noch keine Notizen. „Neue Seite“ legt eine an — gut für
          Session-Zusammenfassungen.
        </p>
      ) : (
        <div className="space-y-3">
          {pages.map((page) => (
            <Panel key={page.id}>
              <NotePageEditor
                page={page}
                save={async (title: string, body: string) => {
                  "use server";
                  await saveNoteAction(characterId, page.id, title, body);
                }}
                remove={async () => {
                  "use server";
                  await removeNoteAction(characterId, page.id);
                }}
              />
            </Panel>
          ))}
        </div>
      )}
    </div>
  );
}
