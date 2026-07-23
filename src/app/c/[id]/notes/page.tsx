import { notFound } from "next/navigation";

import { TrashIcon } from "@/components/icons";
import { Button, inputClass, Panel, SectionLabel } from "@/components/ui";
import { characterIdFromParam } from "@/lib/characterUrl";
import { getCharacter, getNotes } from "@/lib/server/characters";

import {
  addNoteAction,
  removeNoteAction,
  saveBackgroundAction,
  saveNoteAction,
} from "./actions";

export const dynamic = "force-dynamic";

const textareaClass =
  "w-full rounded-md border border-edge bg-ink px-3 py-2.5 text-fg " +
  "placeholder:text-faint focus:border-patina focus:outline-none";

export default async function NotesPage({ params }: PageProps<"/c/[id]">) {
  const { id } = await params;
  const characterId = characterIdFromParam(id);

  const character = getCharacter(characterId);
  if (!character) notFound();

  const pages = getNotes(characterId);

  return (
    <>
      <form
        action={async (formData: FormData) => {
          "use server";
          await saveBackgroundAction(characterId, formData);
        }}
        className="space-y-3"
      >
        <Panel>
          <SectionLabel>Vorgeschichte</SectionLabel>
          <textarea
            name="backstory"
            rows={8}
            defaultValue={character.backstory}
            placeholder="Woher kommt dein Charakter?"
            className={textareaClass}
          />
        </Panel>

        <Button type="submit" variant="solid" size="lg" className="w-full">
          Hintergrund speichern
        </Button>
      </form>

      <div className="pt-2">
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

        {pages.length === 0 ? (
          <p className="text-sm text-faint">
            Noch keine Notizen. „Neue Seite“ legt eine an — gut für
            Session-Zusammenfassungen.
          </p>
        ) : (
          <div className="space-y-3">
            {pages.map((page) => (
              <Panel key={page.id}>
                <form
                  id={`note-${page.id}`}
                  action={async (formData: FormData) => {
                    "use server";
                    await saveNoteAction(characterId, formData);
                  }}
                  className="space-y-2.5"
                >
                  <input type="hidden" name="noteId" value={page.id} />
                  <input
                    name="title"
                    defaultValue={page.title}
                    aria-label="Titel der Notiz"
                    className={`${inputClass} font-semibold`}
                  />
                  <textarea
                    name="body"
                    rows={10}
                    defaultValue={page.body}
                    placeholder="Markdown ist willkommen — gespeichert wird der Rohtext."
                    aria-label="Inhalt der Notiz"
                    className={`${textareaClass} font-mono text-sm`}
                  />
                </form>

                <div className="mt-2.5 flex gap-2">
                  <Button type="submit" form={`note-${page.id}`} className="flex-1">
                    Speichern
                  </Button>

                  <form
                    action={async () => {
                      "use server";
                      await removeNoteAction(characterId, page.id);
                    }}
                  >
                    <button
                      type="submit"
                      aria-label="Diese Seite löschen"
                      className="flex min-h-11 w-11 items-center justify-center rounded-md text-faint transition-colors hover:text-ember"
                    >
                      <TrashIcon className="size-4" />
                    </button>
                  </form>
                </div>
              </Panel>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
